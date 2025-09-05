// 🧠 Zone 25-14 Backend – Main Server Entry Point
// Loads environment, middlewares, routes, PostgreSQL, and Socket.IO

require("dotenv").config({ path: "./src/.env" });

const express = require("express");
const http = require("http");

const pool = require("./src/config/db.js");
const { initSocket } = require("./src/config/socket.js");
const loadMiddlewares = require("./src/config/loadMiddleware");
const loadRoutes = require("./src/config/loadRoutes");

const app = express();
const server = http.createServer(app);

//////////////////////////////////////////////////
// ▪️ Load All Middlewares
//////////////////////////////////////////////////
loadMiddlewares(app);

//////////////////////////////////////////////////
// ▪️ Load All API Routes
//////////////////////////////////////////////////
loadRoutes(app);

//////////////////////////////////////////////////
// ▪️ Root Route (Health Check)
//////////////////////////////////////////////////
app.get("/", (req, res) => {
  res.send("🔥 Welcome to Zone 25-14 API");
});

// Dev-friendly (trust local/loopback addresses)
app.set("trust proxy", ["loopback", "linklocal", "uniquelocal"]);

//////////////////////////////////////////////////
// ▪️ Database + Socket.IO + Server Init
//////////////////////////////////////////////////
pool
  .connect()
  .then((client) => {
    console.log("✅ Connected to PostgreSQL Database");
    client.release(); // Always release back to pool

    initSocket(server); // WebSocket live features

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Server + Socket.IO running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to PostgreSQL:", err.message);
    process.exit(1);
  });
