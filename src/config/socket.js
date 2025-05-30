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

    ioInstance.on("connection", (socket) => {
      console.log(`📡 Socket connected: ${socket.id}`);

      socket.on("joinRoom", (conversationId) => {
        socket.join(conversationId);
        console.log(`👥 Socket ${socket.id} joined room ${conversationId}`);
      });

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
