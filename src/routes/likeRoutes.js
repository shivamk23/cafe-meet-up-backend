const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const User = require("../models/User");

// GET all users who liked the logged-in user
router.get("/liked-by", protect, async (req, res) => {
  try {
    const users = await User.find({ likedUsers: req.user._id }).select(
      "_id firstName age city profilePicture"
    );
    res.json({ success: true, users });
  } catch (err) {
    console.error("Liked-by fetch error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
