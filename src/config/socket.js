// zone_25-14_backend/src/socket.js
let ioInstance;
const onlineUsers = {}; // user_id → socket.id

const pool = require("./db");

module.exports = {
  initSocket(server) {
    const { Server } = require("socket.io");

    ioInstance = new Server(server, {
      cors: {
        origin: "http://localhost:3000",
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

      // JOIN ROOM FOR CHATS
      socket.on("joinRoom", (conversationId) => {
        socket.join(conversationId);
        console.log(`👥 Socket ${socket.id} joined room ${conversationId}`);
      });

      // TYPING INDICATOR (future)
      socket.on("typing", ({ conversationId, sender }) => {
        socket.to(conversationId).emit("showTyping", sender);
      });

      // MESSAGE RELAY
      socket.on("sendMessage", (message) => {
        const convoId = message.conversation_id;
        if (!convoId)
          return console.warn("❗Missing conversation_id on message");
        socket.to(convoId).emit("receiveMessage", message);
      });

      // REACTION RELAY
      socket.on("sendReactionUpdate", ({ conversationId, data }) => {
        if (!conversationId || !data) return;
        socket.to(conversationId).emit("reactionUpdated", data);
      });

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

  getIO() {
    if (!ioInstance) {
      throw new Error("Socket.io not initialized!");
    }
    return ioInstance;
  },

  getOnlineUsers() {
    return onlineUsers;
  },
};

async function broadcastPresenceToFriends(userId, status) {
  try {
    const result = await pool.query(
      `SELECT friend_id FROM friends WHERE user_id = $1 AND is_removed = FALSE AND is_blocked = FALSE`,
      [userId]
    );
    const friends = result.rows.map((row) => row.friend_id);

    friends.forEach((fid) => {
      const fidSocket = onlineUsers[fid];
      if (fidSocket) {
        ioInstance.to(fidSocket).emit("presence", { userId, status });
      }
    });
  } catch (err) {
    console.error("❗ Presence broadcast error:", err);
  }
}
