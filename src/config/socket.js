// File: src/config/socket.js
// Description: Manages Socket.IO instance, presence (now via Redis), and real-time features
// Dependencies: Socket.IO, Redis, PostgreSQL
// This file is part of the Zone 25 project, which is licensed under the GNU General Public License v3.0.

// ─────────────────────────────────────────────
// src/config/socket.js
// File: src/config/socket.js
const pool = require("./db");
const jwt = require("jsonwebtoken");
const redis = require("./redis");
const presenceService = require("../services/presenceService");
const { markMessagesAsRead } = require("../models/messageReadModel");

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

      socket.on("joinRoom", (conversationId) => {
        socket.join(conversationId);
        console.log(`✅ Socket ${socket.id} joined room: ${conversationId}`);

        // Show all rooms this socket is in
        console.log(`   Socket is now in rooms:`, Array.from(socket.rooms));
      });

      // Typing indicator handlers
      socket.on("typing:start", async ({ conversationId, userId }) => {
        console.log("🟢 Backend received typing:start:", {
          conversationId,
          userId,
          socketId: socket.id,
        });

        try {
          // ✅ ADD THIS: Check who's in the room
          const socketsInRoom = await ioInstance
            .in(conversationId)
            .fetchSockets();
          console.log(
            `📡 Room ${conversationId} has ${socketsInRoom.length} sockets:`
          );
          socketsInRoom.forEach((s) => {
            console.log(`   - Socket ${s.id}`);
          });

          const userResult = await pool.query(
            `SELECT username, display_name, profile_picture 
       FROM users WHERE user_id = $1`,
            [userId]
          );

          if (userResult.rows.length === 0) {
            console.log("❌ User not found in database:", userId);
            return;
          }

          const user = userResult.rows[0];
          console.log("✅ Found user:", user.username);

          await pool.query(
            `INSERT INTO typing_indicators (conversation_id, user_id, last_activity)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (conversation_id, user_id)
       DO UPDATE SET last_activity = CURRENT_TIMESTAMP`,
            [conversationId, userId]
          );

          console.log("📤 Emitting user:typing to room:", conversationId);
          socket.to(conversationId).emit("user:typing", {
            conversationId,
            userId,
            user: {
              user_id: user.user_id,
              username: user.username,
              display_name: user.display_name,
              profile_picture: user.profile_picture,
            },
            isTyping: true,
          });
          console.log("✅ user:typing emitted successfully");
        } catch (error) {
          console.error("❌ Error in typing:start:", error);
        }
      });

      socket.on("typing:stop", async ({ conversationId, userId }) => {
        console.log("🔴 Backend received typing:stop:", {
          conversationId,
          userId,
        });

        try {
          await pool.query(
            `DELETE FROM typing_indicators WHERE conversation_id = $1 AND user_id = $2`,
            [conversationId, userId]
          );

          console.log("📤 Emitting typing:stop to room:", conversationId);
          socket.to(conversationId).emit("user:typing", {
            conversationId,
            userId,
            isTyping: false,
          });
        } catch (error) {
          console.error("❌ Error in typing:stop:", error);
        }
      });

      // In your connection handler, add these socket events:

      socket.on("message:read", async (data) => {
        const { messageId, conversationId } = data;
        const userId = socket.userId;

        if (!messageId || !conversationId || !userId) {
          console.error("❌ Invalid message:read data", data);
          return;
        }

        try {
          console.log(
            `👁️ Marking messages in ${conversationId} as read by ${userId}`
          );

          const { markMessagesAsRead } = require("../models/messageReadModel");
          await markMessagesAsRead(conversationId, userId, new Date());

          // ✅ Update ALL messages in this conversation (not just one)
          const result = await pool.query(
            `UPDATE messages 
       SET read_by_count = (
         SELECT COUNT(DISTINCT user_id) 
         FROM message_reads 
         WHERE message_reads.message_id = messages.message_id
       )
       WHERE conversation_id = $1
         AND sender_id != $2
       RETURNING message_id, read_by_count`,
            [conversationId, userId]
          );

          // Broadcast each updated message
          result.rows.forEach((row) => {
            ioInstance.to(conversationId).emit("message:read", {
              messageId: row.message_id,
              userId,
              readByCount: row.read_by_count,
            });
          });

          console.log(
            `✅ Updated ${result.rows.length} messages in ${conversationId}`
          );
        } catch (err) {
          console.error("❌ Mark as read failed:", err);
        }
      });

      // Mark all messages in conversation as read
      socket.on("conversation:markRead", async ({ conversationId, userId }) => {
        console.log("📖 Marking conversation as read:", {
          conversationId,
          userId,
        });

        try {
          // Get all unread messages in this conversation
          const result = await pool.query(
            `SELECT m.message_id 
       FROM messages m
       LEFT JOIN message_reads mr ON m.message_id = mr.message_id AND mr.user_id = $2
       WHERE m.conversation_id = $1 
       AND m.sender_id != $2
       AND mr.message_id IS NULL`,
            [conversationId, userId]
          );

          // Mark all as read
          if (result.rows.length > 0) {
            const messageIds = result.rows.map((r) => r.message_id);

            await pool.query(
              `INSERT INTO message_reads (message_id, user_id, read_at)
         SELECT unnest($1::uuid[]), $2, CURRENT_TIMESTAMP
         ON CONFLICT DO NOTHING`,
              [messageIds, userId]
            );

            // Update counts
            await pool.query(
              `UPDATE messages 
         SET read_by_count = (
           SELECT COUNT(*) FROM message_reads WHERE message_id = messages.message_id
         )
         WHERE message_id = ANY($1)`,
              [messageIds]
            );

            // Broadcast to conversation
            socket.to(conversationId).emit("conversation:read", {
              conversationId,
              userId,
              messageIds,
              readAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error("❌ Error marking conversation as read:", error);
        }
      });

      socket.on("sendReactionUpdate", ({ conversationId, data }) => {
        if (!conversationId || !data) return;
        socket.to(conversationId).emit("reactionUpdated", data);
      });

      socket.on("disconnect", async () => {
        clearInterval(keepAlive);

        try {
          const userId = socket.userId;
          if (userId) {
            // Clean up typing indicators
            const result = await pool.query(
              `DELETE FROM typing_indicators
               WHERE user_id = $1
               RETURNING conversation_id`,
              [userId]
            );

            // Notify all conversations
            result.rows.forEach((row) => {
              ioInstance.to(row.conversation_id).emit("user:typing", {
                conversationId: row.conversation_id,
                userId: userId,
                isTyping: false,
              });
            });

            // Clean up presence
            await redis.del(`presence:${userId}`);
            await presenceService.setUserOffline(userId);
          }
        } catch (error) {
          console.error("Error in disconnect handler:", error);
        }
      });
    });

    // ✅ FIX: Move setInterval OUTSIDE connection handler (only run once)
    setInterval(async () => {
      try {
        const result = await pool.query(
          `DELETE FROM typing_indicators 
           WHERE last_activity < (CURRENT_TIMESTAMP - INTERVAL '10 seconds') 
           RETURNING conversation_id, user_id`
        );

        // ✅ FIX: Use ioInstance instead of io
        result.rows.forEach((row) => {
          ioInstance.to(row.conversation_id).emit("user:typing", {
            conversationId: row.conversation_id,
            userId: row.user_id,
            isTyping: false,
          });
        });
      } catch (error) {
        console.error("Error in cleanup:", error);
      }
    }, 500);

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
