// 🧠 Zone 25-14 Backend – Main Server Entry Point
// Loads environment, middlewares, routes, PostgreSQL, and Socket.IO

require("dotenv").config({ path: "./src/.env" });

const express = require("express");
const http = require("http");

const pool = require("./src/config/db.js");
const { initSocket } = require("./src/config/socket.js");
const loadMiddlewares = require("./src/config/loadMiddleware");
const loadRoutes = require("./src/config/loadRoutes");
const {
  runStartupScripts,
  scheduleMaintenanceTasks,
} = require("./src/config/startupScripts");

const app = express();
const server = http.createServer(app);

app.use(require("cookie-parser")());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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

    if (process.env.NODE_ENV !== "production") {
      require("./src/services/email/transport").verifyTransport();
    }
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);

      // ✅ Run startup scripts (non-blocking)
      runStartupScripts().catch((err) =>
        console.error("Startup scripts error:", err)
      );

      // ✅ Schedule maintenance tasks
      scheduleMaintenanceTasks();
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to PostgreSQL:", err.message);
    process.exit(1);
  });
