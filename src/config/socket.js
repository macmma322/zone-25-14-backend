// File: src/config/socket.js
// Description: Manages Socket.IO instance, presence (now via Redis), and real-time features
// Dependencies: Socket.IO, Redis, PostgreSQL
// This file is part of the Zone 25 project, which is licensed under the GNU General Public License v3.0.

// ─────────────────────────────────────────────
const pool = require("./db");
const jwt = require("jsonwebtoken");
const redis = require("./redis");
const presenceService = require("../services/presenceService");

let ioInstance;

module.exports = {
  initSocket(server) {
    const { Server } = require("socket.io");

    ioInstance = new Server(server, {
      cors: {
        origin: "http://localhost:3000",
        credentials: true,
      },
    });

    ioInstance.on("connection", async (socket) => {
      console.log(`📡 Socket connected: ${socket.id}`);

      try {
        const cookie = socket.handshake.headers.cookie || "";
        const match = cookie.match(/authToken=([^;]+)/);

        if (match) {
          const token = match[1];
          console.log("🍪 Incoming authToken cookie:", token);

          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          console.log("🔐 Token valid:", decoded);

          const userId = decoded.user_id;

          if (userId) {
            socket.userId = userId;
            await presenceService.setUserOnline(userId);
            await redis.set(`presence:${userId}`, socket.id);
            await redis.expire(`presence:${userId}`, 300); // 5 minutes expiry
            await broadcastPresenceToFriends(userId, "online");
          }
        }
      } catch (err) {
        console.warn("⚠️ Socket auth error:", err.message);
      }

      socket.on("joinRoom", (conversationId) => {
        socket.join(conversationId);
        console.log(`👥 Socket ${socket.id} joined room ${conversationId}`);
      });

      socket.on("typing", ({ conversationId, sender }) => {
        socket.to(conversationId).emit("showTyping", sender);
      });

      socket.on("sendReactionUpdate", ({ conversationId, data }) => {
        if (!conversationId || !data) return;
        socket.to(conversationId).emit("reactionUpdated", data);
      });

      socket.on("reconnect", async () => {
        console.log("🔁 Socket reconnected");
        try {
          await presenceService.setUserOnline(socket.userId);
          await broadcastPresenceToFriends(socket.userId, "online");
        } catch (err) {
          console.error("Reconnect presence error:", err);
        }
      });

      socket.on("disconnect", async () => {
        console.log(`❌ Disconnected: ${socket.id}`);
        const userId = socket.userId;
        if (userId) {
          await redis.del(`presence:${userId}`);
          await presenceService.setUserOffline(userId);
          await broadcastPresenceToFriends(userId, "offline");
        }
      });
    });

    return ioInstance;
  },

  getIO() {
    if (!ioInstance) {
      throw new Error("Socket.IO not initialized");
    }
    return ioInstance;
  },

  async getOnlineUsers() {
    const keys = await redis.keys("presence:*");
    return keys.map((key) => key.split(":")[1]);
  },

  async getSocketIdByUserId(userId) {
    return await redis.get(`presence:${userId}`);
  },
};

async function broadcastPresenceToFriends(userId, status) {
  try {
    const result = await pool.query(
      `SELECT friend_id FROM friends
       WHERE user_id = $1 AND is_removed = FALSE AND is_blocked = FALSE`,
      [userId]
    );

    const lastSeen =
      status === "offline" ? await presenceService.getLastSeen(userId) : null;

    const friends = result.rows.map((r) => r.friend_id);
    console.log("📢 Broadcasting to:", friends);
    console.log("🎯 Sending status for:", userId, status);

    for (const friendId of friends) {
      const socketId = await redis.get(`presence:${friendId}`);
      if (socketId) {
        ioInstance.to(socketId).emit("presence", {
          userId,
          status,
          lastSeen,
        });
      }
    }
  } catch (err) {
    console.error("❗ Presence broadcast error:", err);
  }
}
