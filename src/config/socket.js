// File: src/config/socket.js
// Description: Manages Socket.IO instance, presence, and real-time features
// Dependencies: Socket.IO, PostgreSQL client, online user tracking
// This file is part of the Zone 25 project, which is licensed under the GNU General Public License v3.0.

// ─────────────────────────────────────────────
const pool = require("./db");
const jwt = require("jsonwebtoken");

let ioInstance;
const onlineUsers = {}; // Maps user_id → socket.id

module.exports = {
  // 🔌 Initialize the Socket.IO server
  initSocket(server) {
    const { Server } = require("socket.io");

    ioInstance = new Server(server, {
      cors: {
        origin: "http://localhost:3000", // ⚠️ update in prod
        credentials: true,
      },
    });

    ioInstance.on("connection", (socket) => {
      console.log(`📡 Socket connected: ${socket.id}`);

      try {
        // 🍪 Extract JWT token from cookies
        const cookie = socket.handshake.headers.cookie || "";
        const match = cookie.match(/authToken=([^;]+)/);

        if (match) {
          const token = match[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const userId = decoded.user_id;

          if (userId) {
            socket.userId = userId; // 🔒 store on socket
            onlineUsers[userId] = socket.id;
            console.log(`✅ User ${userId} is now online`);
            broadcastPresenceToFriends(userId, "online");
          }
        }
      } catch (err) {
        console.warn("⚠️ Socket auth error:", err.message);
      }

      // 👥 Join chat room
      socket.on("joinRoom", (conversationId) => {
        socket.join(conversationId);
        console.log(`👥 Socket ${socket.id} joined room ${conversationId}`);
      });

      // ✍️ Typing indicator
      socket.on("typing", ({ conversationId, sender }) => {
        socket.to(conversationId).emit("showTyping", sender);
      });

      // 🔁 Emoji reactions
      socket.on("sendReactionUpdate", ({ conversationId, data }) => {
        if (!conversationId || !data) return;
        socket.to(conversationId).emit("reactionUpdated", data);
      });

      // ❌ Disconnect cleanup
      socket.on("disconnect", () => {
        console.log(`❌ Disconnected: ${socket.id}`);
        const userId = socket.userId;
        if (userId) {
          delete onlineUsers[userId];
          broadcastPresenceToFriends(userId, "offline");
        }
      });
    });

    return ioInstance;
  },

  // 📤 Emit access for controllers/services
  getIO() {
    if (!ioInstance) {
      throw new Error("Socket.IO not initialized");
    }
    return ioInstance;
  },

  // 🔍 Get all current online users
  getOnlineUsers() {
    return onlineUsers;
  },

  // 🔎 Get specific socket ID by user
  getSocketIdByUserId(userId) {
    return onlineUsers[userId] || null;
  },
};

// ─────────────────────────────────────────────
// 🔄 Notify friends when someone goes online/offline
async function broadcastPresenceToFriends(userId, status) {
  try {
    const result = await pool.query(
      `SELECT friend_id FROM friends
       WHERE user_id = $1 AND is_removed = FALSE AND is_blocked = FALSE`,
      [userId]
    );

    const friends = result.rows.map((r) => r.friend_id);

    friends.forEach((friendId) => {
      const socketId = onlineUsers[friendId];
      if (socketId) {
        ioInstance.to(socketId).emit("presence", { userId, status });
      }
    });
  } catch (err) {
    console.error("❗ Presence broadcast error:", err);
  }
}
