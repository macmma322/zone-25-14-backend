let ioInstance;

module.exports = {
  initSocket(server) {
    const { Server } = require("socket.io");

    ioInstance = new Server(server, {
      cors: {
        origin: "http://localhost:3000", // Adjust for production if needed
        credentials: true,
      },
    });

    ioInstance.on("connection", (socket) => {
      console.log(`📡 Socket connected: ${socket.id}`);

      // 🟢 Join chat room
      socket.on("joinRoom", (conversationId) => {
        socket.join(conversationId);
        console.log(`👥 Socket ${socket.id} joined room ${conversationId}`);
      });

      // ✍️ Typing indicator (not used yet, but ready)
      socket.on("typing", ({ conversationId, sender }) => {
        socket.to(conversationId).emit("showTyping", sender);
      });

      // 💬 Real-time message relay from frontend → others
      socket.on("sendMessage", (message) => {
        const convoId = message.conversation_id;
        if (!convoId)
          return console.warn("❗Missing conversation_id on message");
        socket.to(convoId).emit("receiveMessage", message);
      });

      // 💥 Real-time reaction update relay
      socket.on("sendReactionUpdate", ({ conversationId, data }) => {
        if (!conversationId || !data) return;
        socket.to(conversationId).emit("reactionUpdated", data);
      });

      // ❌ Disconnection
      socket.on("disconnect", () => {
        console.log(`❌ Socket disconnected: ${socket.id}`);
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
};
