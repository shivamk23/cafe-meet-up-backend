const User = require("../models/User");
const { sendNotification } = require("../utils/ws");
const Match = require("../models/Match");

// Get profiles excluding logged-in user's likes/skips
const getProfiles = async (req, res) => {
  try {
    const loggedUserId = req.user._id;

    // Get logged-in user's info
    const loggedUser = await User.findById(loggedUserId).select(
      "interests likedUsers skippedUsers"
    );
    const userInterests = loggedUser.interests || [];

    // 🔹 Find all matches involving this user
    const userMatches = await Match.find({
      users: loggedUserId,
    }).select("users");

    // 🔹 Extract IDs of matched users
    const matchedUserIds = userMatches.flatMap((m) =>
      m.users.filter((u) => u.toString() !== loggedUserId.toString())
    );

    // 🔹 Combine all excluded IDs
    const excludeIds = [
      loggedUserId,
      ...loggedUser.likedUsers,
      ...loggedUser.skippedUsers,
      ...matchedUserIds,
    ];

    // 🔹 Find profiles excluding liked/skipped/matched users
    let profiles = await User.find({
      _id: { $nin: excludeIds },
      interests: { $in: userInterests },
    }).select("_id firstName lastName age bio profilePicture interests");

    // Sort by number of matching interests
    profiles = profiles.map((p) => {
      const matchScore = p.interests.filter((i) =>
        userInterests.includes(i)
      ).length;
      return { ...p.toObject(), matchScore };
    });
    profiles.sort((a, b) => b.matchScore - a.matchScore);

    res.json({ success: true, profiles });
  } catch (error) {
    console.error("Get profiles error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const likeProfile = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required" });

    const likedUser = await User.findById(userId);
    const currentUser = await User.findById(req.user._id);

    if (!likedUser) return res.status(404).json({ message: "User not found" });

    // 1️⃣ Remove from skipped if previously skipped
    currentUser.skippedUsers = currentUser.skippedUsers.filter(
      (id) => id.toString() !== userId
    );

    // 2️⃣ Add to likedUsers if not already liked
    if (!currentUser.likedUsers.includes(userId)) {
      currentUser.likedUsers.push(userId);
    }

    await currentUser.save();

    // 3️⃣ Check for match
    const isMutual = likedUser.likedUsers.includes(currentUser._id);

    if (isMutual) {
      // ✅ Create Match record if not already created
      const alreadyMatched = await Match.findOne({
        users: { $all: [currentUser._id, likedUser._id] },
      });

      if (!alreadyMatched) {
        await Match.create({ users: [currentUser._id, likedUser._id] });
      }

      // ✅ Remove from each other’s liked lists (not needed anymore)
      currentUser.likedUsers = currentUser.likedUsers.filter(
        (id) => id.toString() !== likedUser._id.toString()
      );
      likedUser.likedUsers = likedUser.likedUsers.filter(
        (id) => id.toString() !== currentUser._id.toString()
      );

      // ✅ Add notifications
      const notifA = {
        type: "match",
        from: currentUser._id,
        read: false,
        createdAt: new Date(),
      };
      const notifB = {
        type: "match",
        from: likedUser._id,
        read: false,
        createdAt: new Date(),
      };

      likedUser.notifications.push(notifA);
      currentUser.notifications.push(notifB);

      await likedUser.save();
      await currentUser.save();

      // ✅ Send real-time notifications
      sendNotification(likedUser._id.toString(), {
        message: `🎉 It's a match! You and ${currentUser.firstName} liked each other!`,
        type: "match",
        createdAt: notifA.createdAt,
      });

      sendNotification(currentUser._id.toString(), {
        message: `🎉 It's a match! You and ${likedUser.firstName} liked each other!`,
        type: "match",
        createdAt: notifB.createdAt,
      });

      return res.json({
        success: true,
        isMatch: true,
        message: "It's a match! ❤️",
      });
    }

    // 4️⃣ If not a mutual match → just send "like" notification
    const likeNotif = {
      type: "like",
      from: currentUser._id,
      read: false,
      createdAt: new Date(),
    };
    likedUser.notifications.push(likeNotif);
    await likedUser.save();

    sendNotification(likedUser._id.toString(), {
      message: `${currentUser.firstName} liked your profile 💛`,
      type: "like",
      createdAt: likeNotif.createdAt,
    });

    res.json({
      success: true,
      isMatch: false,
      message: "User liked successfully",
    });
  } catch (error) {
    console.error("Like profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const getNotifications = async (req, res) => {
  const notifications = req.user.notifications
    .sort((a, b) => b.createdAt - a.createdAt)
    .map((n) => ({
      _id: n._id,
      message:
        n.type === "like"
          ? "Someone liked you!"
          : n.type === "match"
          ? "You have a new match!"
          : "New message",
      read: n.read,
      createdAt: n.createdAt,
    }));

  res.json({ success: true, notifications });
};

const markNotificationsRead = async (req, res) => {
  req.user.notifications.forEach((n) => (n.read = true));
  await req.user.save();
  res.json({ success: true });
};

const sendLikeNotification = async (req, res) => {
  const { userId } = req.body;
  const likedUser = await User.findById(userId);
  if (!likedUser) return res.status(404).json({ message: "User not found" });

  const notif = {
    type: "like",
    from: req.user._id,
    read: false,
    createdAt: new Date(),
  };
  likedUser.notifications.push(notif);
  await likedUser.save();

  sendNotification(userId, {
    _id: notif._id,
    message: "Someone liked you!",
    read: false,
    createdAt: notif.createdAt,
  });

  res.json({ success: true, message: "Notification sent" });
};

const skipProfile = async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId required" });

    // 1️⃣ Ensure userId exists
    const userToSkip = await User.findById(userId);
    if (!userToSkip) return res.status(404).json({ message: "User not found" });

    // 2️⃣ Remove from likedUsers if exists
    req.user.likedUsers = req.user.likedUsers.filter(
      (id) => id.toString() !== userId
    );

    // 3️⃣ Add to skippedUsers only if not already there
    if (!req.user.skippedUsers.includes(userId)) {
      req.user.skippedUsers.push(userId);
    }

    await req.user.save();

    // 4️⃣ (Optional) Remove current user from the other user's likedBy, if applicable
    if (userToSkip.likedUsers.includes(req.user._id)) {
      userToSkip.likedUsers = userToSkip.likedUsers.filter(
        (id) => id.toString() !== req.user._id.toString()
      );
      await userToSkip.save();
    }

    res.json({ success: true, message: "User skipped successfully" });
  } catch (error) {
    console.error("Skip profile error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getProfiles,
  likeProfile,
  skipProfile,
  getNotifications,
  markNotificationsRead,
  sendLikeNotification,
};
