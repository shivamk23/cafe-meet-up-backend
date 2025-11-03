const express = require("express");
const router = express.Router();
const {
  getProfiles,
  likeProfile,
  skipProfile,
  getNotifications,
  markNotificationsRead,
  sendLikeNotification,
} = require("../controllers/profileController");
const { protect } = require("../middlewares/authMiddleware");
const User = require("../models/User");
const Match = require("../models/Match");


router.get("/", protect, getProfiles);
router.post("/like", protect, likeProfile);
router.post("/skip", protect, skipProfile);
router.get("/notifications", protect, getNotifications);
router.post("/mark-read", protect, markNotificationsRead);
// Get single profile by ID
router.get("/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "_id firstName age city bio interests profilePicture"
    );
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});
// GET all users who liked the logged-in user
router.get("/liked-by", protect, async (req, res) => {
  try {
    // Find all matches that include this user
    const matches = await Match.find({ users: req.user._id }).lean();
    const matchedUserIds = matches.flatMap((m) =>
      m.users.map((u) => u.toString())
    );

    const users = await User.find({
      likedUsers: req.user._id,
      _id: { $nin: [...req.user.skippedUsers, ...matchedUserIds] },
    }).select("_id firstName age city profilePicture");

    res.json({ success: true, users });
  } catch (err) {
    console.error("Liked-by fetch error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// router.post("/send-like-notification", protect, sendLikeNotification);

module.exports = router;
