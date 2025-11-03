const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const likeRoutes = require("./routes/likeRoutes");
const { errorHandler } = require("./middlewares/errorMiddleware");

const app = express();

// Middlewares
app.use(bodyParser.json());
app.use(cookieParser());

// CORS configuration
const allowedOrigins = ["http://localhost:8080", "http://localhost:5173"];
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/likes", likeRoutes);
// Serve uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Error middleware
app.use(errorHandler);

module.exports = app;
