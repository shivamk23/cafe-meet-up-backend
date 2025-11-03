require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const url = require("url");
const jwt = require("jsonwebtoken");

const connectDB = require("./src/config/db");
const User = require("./src/models/User");
const authRoutes = require("./src/routes/authRoutes");
const profileRoutes = require("./src/routes/profileRoutes");
const likeRoutes = require("./src/routes/likeRoutes");
const matchRoutes = require("./src/routes/matchRoutes");
const chatRoutes = require("./src/routes/chatRoutes");
const {
  registerClient,
  removeClient,
  handleMessageEvent,
  broadcastStatus,
} = require("./src/utils/ws");
const { errorHandler } = require("./src/middlewares/errorMiddleware");

const app = express();
const path = require("path");
app.use("/uploads", express.static(path.join(__dirname, "src/uploads")));

// Middlewares
app.use(bodyParser.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:8080",
      "https://cafemeetups.com",
    ],
    credentials: true,
  })
);
app.use(cors({ origin: "*" }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/likes", likeRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/chat", chatRoutes);
app.use("/uploads", express.static("uploads"));
app.use(errorHandler);

// Connect MongoDB
connectDB();

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server });

wss.on("connection", async (ws, req) => {
  try {
    const query = url.parse(req.url, true).query;
    const token = query.token;
    if (!token) return ws.close();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return ws.close();

    registerClient(user._id.toString(), ws);
    console.log(`🟢 User connected: ${user.firstName}`);

    ws.on("message", (msg) => handleMessageEvent(user._id.toString(), msg));
    broadcastStatus(user._id.toString(), "online");

    ws.on("close", () => {
      removeClient(user._id.toString());
      broadcastStatus(user._id.toString(), "offline");
      console.log(`🔴 User disconnected: ${user.firstName}`);
    });
  } catch (err) {
    console.error("WebSocket error:", err);
    ws.close();
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT} 🚀`);
});
