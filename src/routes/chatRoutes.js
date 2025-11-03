const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const Message = require("../models/Message");
const Match = require("../models/Match");
const { sendNotification } = require("../utils/ws");

// 📨 Get all messages for a match
router.get("/:matchId", protect, async (req, res) => {
  try {
    const { matchId } = req.params;

    // Find match and populate both users in the array
    const match = await Match.findById(matchId).populate(
      "users",
      "firstName profilePicture"
    );

    if (!match)
      return res
        .status(404)
        .json({ success: false, message: "Match not found" });

    // Get all chat messages for this match
    const messages = await Message.find({ matchId })
      .populate("sender", "firstName profilePicture")
      .sort({ createdAt: 1 });

    // Identify the other user (the one you're chatting with)
    const currentUserId = req.user._id.toString();
    const otherUser = match.users.find(
      (u) => u._id.toString() !== currentUserId
    );

    res.json({
      success: true,
      currentUserId,
      match: {
        users: match.users,
        otherUser,
      },
      messages,
    });
  } catch (err) {
    console.error("Fetch messages error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});



// 💬 Send a new message
router.post("/", protect, async (req, res) => {
  try {
    const { matchId, text, receiverId } = req.body;

    if (!matchId || !text || !receiverId)
      return res.status(400).json({ message: "Missing fields" });

    const message = await Message.create({
      matchId,
      sender: req.user._id,
      receiver: receiverId,
      text,
    });

    // send live message to receiver
    sendNotification(receiverId, {
      type: "chat",
      from: req.user._id,
      message: text,
      matchId,
      createdAt: message.createdAt,
    });

    res.json({ success: true, message });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
