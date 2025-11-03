const jwt = require("jsonwebtoken");

const express = require("express");
const {
  registerUser,
  loginUser,
  getUserProfile,
  upload,
  checkLoginStatus,
} = require("../controllers/authController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// Auth routes
router.post("/register", upload.single("profilePicture"), registerUser);
router.post("/login", loginUser);
router.get("/check", checkLoginStatus);

// Logout
router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  res.json({ message: "Logged out" });
});

// WebSocket token route
router.get("/ws-token", protect, (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: "Invalid user" });
    }
    const wsToken = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ token: wsToken });
  } catch (err) {
    console.error("WS token generation error:", err);
    res.status(500).json({ message: "Server error generating WS token" });
  }
});

// Get current user
router.get("/me", protect, getUserProfile);

module.exports = router;
