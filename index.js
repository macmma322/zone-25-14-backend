// Zone 25-14 Backend API (index.js)
// Main entry point for the Zone 25-14 backend API with Socket.IO support

require("dotenv").config({ path: "./src/.env" });
const express = require("express");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const pool = require("./src/config/db.js");
const { initSocket } = require("./src/config/socket.js");

const app = express();
const server = http.createServer(app);

// ▪️ Middleware
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// Apply rate limiting to the API
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `windowMs`
    message: "Too many requests from this IP, please try again later.",
  })
);

// ▪️ API Routes
app.use("/api/auth", require("./src/routes/auth/authRoutes"));
app.use("/api/users", require("./src/routes/users/usersRoutes"));
app.use("/api/users", require("./src/routes/users/relationshipRoutes"));
app.use("/api/points", require("./src/routes/points/pointsRoutes"));
app.use("/api/orders", require("./src/routes/orders/orderRoutes"));
app.use("/api", require("./src/routes/products/productRoutes"));
app.use("/api", require("./src/routes/cart/cartRoutes"));
app.use("/api", require("./src/routes/wishlist/wishlistRoutes"));
app.use("/api", require("./src/routes/subscriptions/subscriptionRoutes"));
app.use("/api/roles", require("./src/routes/roles/rolesRoutes"));
app.use("/api/messaging", require("./src/routes/messaging/messagingRoutes"));
app.use("/api/reactions", require("./src/routes/messaging/reactionRoutes"));

// ✅ Notifications route
app.use(
  "/api/notifications",
  require("./src/routes/notifications/notificationRoutes")
);

// ▪️ Root Route
app.get("/", (req, res) => {
  res.send("🔥 Welcome to Zone 25-14 API");
});

// ▪️ Database + Socket + Server Startup
pool
  .connect()
  .then((client) => {
    console.log("✅ Connected to PostgreSQL Database");
    client.release();

    // Initialize Socket.IO
    initSocket(server); // ✅ no circular dependency now

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 Server + Socket.IO running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to PostgreSQL:", err.message);
    process.exit(1);
  });
