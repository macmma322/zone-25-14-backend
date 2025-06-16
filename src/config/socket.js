// File: src/config/socket.js
// Description: Manages Socket.IO instance, presence, and real-time features
// Dependencies: Socket.IO, PostgreSQL client, online user tracking
// This file is part of the Zone 25 project, which is licensed under the GNU General Public License v3.0.

let ioInstance;
const onlineUsers = {}; // Maps user_id → socket.id

const pool = require("./db");

module.exports = {
  // 🔌 Initialize Socket.IO server
  initSocket(server) {
    const { Server } = require("socket.io");

    ioInstance = new Server(server, {
      cors: {
        origin: "http://localhost:3000", // change in production
        credentials: true,
      },
    });

    ioInstance.on("connection", (socket) => {
      console.log(`📡 Socket connected: ${socket.id}`);

      const userId = socket.handshake.auth?.userId;
      if (userId) {
        onlineUsers[userId] = socket.id;
        console.log(`✅ User ${userId} is now online`);
        broadcastPresenceToFriends(userId, "online");
      }

      // ✅ Join conversation room
      socket.on("joinRoom", (conversationId) => {
        socket.join(conversationId);
        console.log(`👥 Socket ${socket.id} joined room ${conversationId}`);
      });

      // ✍️ Typing indicator
      socket.on("typing", ({ conversationId, sender }) => {
        socket.to(conversationId).emit("showTyping", sender);
      });

      // 🔁 Reactions (already covered in controller too)
      socket.on("sendReactionUpdate", ({ conversationId, data }) => {
        if (!conversationId || !data) return;
        socket.to(conversationId).emit("reactionUpdated", data);
      });

      // ❌ Disconnection
      socket.on("disconnect", () => {
        console.log(`❌ Disconnected: ${socket.id}`);
        if (userId) {
          delete onlineUsers[userId];
          broadcastPresenceToFriends(userId, "offline");
        }
      });
    });

    return ioInstance;
  },

  // 📤 Emit from backend
  getIO() {
    if (!ioInstance) {
      throw new Error("Socket.IO not initialized");
    }
    return ioInstance;
  },

  // 👥 All online users
  getOnlineUsers() {
    return onlineUsers;
  },

  // 📡 Used by notificationService
  getSocketIdByUserId(userId) {
    return onlineUsers[userId] || null;
  },
};

// 🔄 Broadcast presence changes to friends
async function broadcastPresenceToFriends(userId, status) {
  try {
    const result = await pool.query(
      `SELECT friend_id FROM friends
       WHERE user_id = $1 AND is_removed = FALSE AND is_blocked = FALSE`,
      [userId]
    );

    const friends = result.rows.map((r) => r.friend_id);
    friends.forEach((fid) => {
      const socketId = onlineUsers[fid];
      if (socketId) {
        ioInstance.to(socketId).emit("presence", { userId, status });
      }
    });
  } catch (err) {
    console.error("❗Presence broadcast error:", err);
  }
}
