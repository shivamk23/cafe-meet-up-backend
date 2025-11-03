// src/routes/matchRoutes.js
const express = require("express");
const router = express.Router();
const { protect } = require("../middlewares/authMiddleware");
const Match = require("../models/Match");

// ✅ Get all matches for current user
router.get("/", protect, async (req, res) => {
  try {
    const matches = await Match.find({ users: req.user._id })
      .populate("users", "_id firstName age city profilePicture")
      .sort({ createdAt: -1 });

    // Remove self from each match’s user list
    const formatted = matches.map((match) => ({
      _id: match._id,
      user: match.users.find(
        (u) => u._id.toString() !== req.user._id.toString()
      ),
      createdAt: match.createdAt,
    }));

    res.json({ success: true, matches: formatted });
  } catch (err) {
    console.error("Error fetching matches:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
