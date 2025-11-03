const multer = require("multer");
const path = require("path");
const User = require("../models/User");
const generateToken = require("../utils/jwt");
const sendWelcomeEmail = require("../utils/emailService");
const fs = require("fs");
const bcrypt = require("bcrypt"); // or "bcryptjs" if using that
const jwt = require("jsonwebtoken");

// Configure multer storage
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads")); // make sure path is correct
  },
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    cb(null, `${Date.now()}-profilePicture.${ext}`);
  },
});

const upload = multer({ storage });

// Register User
// const registerUser = async (req, res) => {
//   try {
//     // req.body will now have form fields
//     const {
//       firstName,
//       lastName,
//       email,
//       password,
//       phone,
//       bio,
//       reasonToJoin,
//       community,
//       instagram,
//       facebook,
//       youtube,
//     } = req.body;

//     const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;

//     console.log("Form Data:", req.body);
//     console.log("File:", req.file);

//     const existingUser = await User.findOne({ email });
//     if (existingUser)
//       return res.status(400).json({ message: "User already exists" });

//     const userData = {
//       firstName,
//       lastName,
//       email,
//       password,
//       phone,
//       bio,
//       reasonToJoin,
//       community,
//       instagram,
//       facebook,
//       youtube,
//       profilePicture, // save relative URL
//     };

//     const user = await User.create(userData);

//     // Send welcome email
//     sendWelcomeEmail(user);

//     res.status(201).json({
//       _id: user._id,
//       firstName: user.firstName,
//       lastName: user.lastName,
//       email: user.email,
//       profilePicture: user.profilePicture,
//       token: generateToken(user._id),
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: "Server error" });
//   }
// };

const registerUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      age,
      gender,
      bio,
      reasonToJoin,
      community,
      interests, // This will be a JSON string from frontend
      instagram,
      facebook,
      youtube,
    } = req.body;

    const profilePicture = req.file ? `/uploads/${req.file.filename}` : null;

    console.log("Form Data:", req.body);
    console.log("File:", req.file);

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !phone ||
      !age ||
      !gender ||
      !bio ||
      !reasonToJoin
    ) {
      return res
        .status(400)
        .json({ message: "Please fill all required fields" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Parse interests from JSON string
    let parsedInterests = [];
    if (interests) {
      try {
        parsedInterests = JSON.parse(interests);
      } catch (error) {
        console.error("Error parsing interests:", error);
        parsedInterests = [];
      }
    }

    // Validate age
    const ageNumber = parseInt(age);
    if (isNaN(ageNumber) || ageNumber < 18 || ageNumber > 100) {
      return res
        .status(400)
        .json({ message: "Age must be between 18 and 100" });
    }

    // Create user data object
    const userData = {
      firstName,
      lastName,
      email,
      password,
      phone,
      age: ageNumber,
      gender,
      bio,
      reasonToJoin,
      community,
      interests: parsedInterests,
      instagram: instagram || undefined,
      facebook: facebook || undefined,
      youtube: youtube || undefined,
      profilePicture,
    };

    // Create user
    const user = await User.create(userData);

    // Send welcome email
    try {
      await sendWelcomeEmail(user);
    } catch (emailError) {
      console.error("Error sending welcome email:", emailError);
      // Don't fail registration if email fails
    }

    // Return success response
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        age: user.age,
        gender: user.gender,
        phone: user.phone,
        bio: user.bio,
        interests: user.interests,
        profilePicture: user.profilePicture,
        createdAt: user.createdAt,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      message: "Server error during registration",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Login controller
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and password are required" });

    const user = await User.findOne({ email });
    
    if (!user) return res.status(404).json({ message: "User not found" });

    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid password" });

    const token = generateToken(user._id);

    // ✅ Set JWT in HttpOnly cookie
    res
      .cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      })
      .status(200)
      .json({
        message: "Login successful",
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profilePicture: user.profilePicture,
          phone: user.phone,
          bio: user.bio,
          reasonToJoin: user.reasonToJoin,
          community: user.community,
        },
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

const checkLoginStatus = async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.json({ loggedIn: false });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch only the needed fields
    const user = await User.findById(decoded.id).select(
      "firstName email profilePicture"
    );

    if (!user) {
      return res.json({ loggedIn: false });
    }

    // ✅ Return logged-in user with profile picture
    res.json({
      loggedIn: true,
      user: {
        _id: user._id,
        firstName: user.firstName,
        email: user.email,
        profilePicture: user.profilePicture || null,
      },
    });
  } catch (error) {
    console.error("Check login error:", error);
    res.json({ loggedIn: false });
  }
};


module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  upload,
  checkLoginStatus,
};
