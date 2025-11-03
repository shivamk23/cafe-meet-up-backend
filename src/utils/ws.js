// Map to store connected users: userId -> WebSocket connection
const WebSocket = require("ws");
const clients = new Map();

const registerClient = (userId, ws) => {
  clients.set(userId.toString(), ws);
};

const removeClient = (userId) => {
  clients.delete(userId.toString());
};

// Send message to specific user
const sendToUser = (toUserId, payload) => {
  const ws = clients.get(toUserId?.toString());
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
};

// Listen for typing + chat events
const handleMessageEvent = (userId, message) => {
  try {
    const data = JSON.parse(message);

    // Typing indicator
    if (data.type === "typing" && data.to) {
      sendToUser(data.to, {
        type: "typing",
        from: userId,
        matchId: data.matchId,
      });
    }

    // Chat message (real-time delivery)
    if (data.type === "chat" && data.to && data.text) {
      sendToUser(data.to, {
        type: "chat",
        from: userId,
        text: data.text,
        matchId: data.matchId,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("Invalid WS message:", err);
  }
};

const broadcastStatus = (userId, status) => {
  const message = JSON.stringify({
    type: "status",
    userId,
    status,
  });

  for (const [, socket] of clients.entries()) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(message);
    }
  }
};


/**
 * Send a notification to a specific user
 * @param {string} toUserId - ID of the user to send notification to
 * @param {object} notification - notification object
 */
const sendNotification = (toUserId, notification) => {
  const ws = clients.get(toUserId);
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type: "notification", notification }));
  }
};

module.exports = {
  registerClient,
  removeClient,
  sendNotification,
  handleMessageEvent,
  sendToUser,
  broadcastStatus,
};
