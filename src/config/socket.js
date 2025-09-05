// File: src/config/socket.js
// Description: Manages Socket.IO instance, presence (now via Redis), and real-time features
// Dependencies: Socket.IO, Redis, PostgreSQL
// This file is part of the Zone 25 project, which is licensed under the GNU General Public License v3.0.

// ─────────────────────────────────────────────
// src/config/socket.js
const pool = require("./db");
const jwt = require("jsonwebtoken");
const redis = require("./redis");
const presenceService = require("../services/presenceService");

let ioInstance;

module.exports = {
  initSocket(server) {
    const { Server } = require("socket.io");

    ioInstance = new Server(server, {
      cors: { origin: "http://localhost:3000", credentials: true },
    });

    ioInstance.on("connection", async (socket) => {
      let userId = null;

      try {
        const cookie = socket.handshake.headers.cookie || "";
        const match = cookie.match(/authToken=([^;]+)/);
        if (match) {
          const decoded = jwt.verify(match[1], process.env.JWT_SECRET);
          userId = decoded.user_id || null;
        }
      } catch (err) {
        console.warn("⚠️ Socket auth error:", err.message);
      }

      if (!userId) {
        // Optional: silently return instead of disconnecting
        // socket.disconnect(true);
        return;
      }

      socket.userId = userId;

      // presence map + keep it fresh
      await presenceService.setUserOnline(userId);
      await redis.set(`presence:${userId}`, socket.id);
      await redis.expire(`presence:${userId}`, 300);

      // ✅ stable per-user room
      socket.join(`user:${userId}`);

      const keepAlive = setInterval(() => {
        redis.expire(`presence:${userId}`, 300).catch(() => {});
      }, 60_000);

      socket.on("joinRoom", (conversationId) => socket.join(conversationId));
      socket.on("typing", ({ conversationId, sender }) => {
        socket.to(conversationId).emit("showTyping", sender);
      });
      socket.on("sendReactionUpdate", ({ conversationId, data }) => {
        if (!conversationId || !data) return;
        socket.to(conversationId).emit("reactionUpdated", data);
      });

      socket.on("disconnect", async () => {
        clearInterval(keepAlive);
        await redis.del(`presence:${userId}`);
        await presenceService.setUserOffline(userId);
      });
    });

    return ioInstance;
  },

  getIO() {
    if (!ioInstance) throw new Error("Socket.IO not initialized");
    return ioInstance;
  },

  async getOnlineUsers() {
    const keys = await redis.keys("presence:*");
    return keys.map((k) => k.split(":")[1]);
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
