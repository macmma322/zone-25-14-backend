// index.js
require("dotenv").config({ path: "./src/.env" });

const express = require("express");
const pool = require("./src/config/db.js");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// 🔥 Must come BEFORE any routes
app.use(express.json()); // ✅ Allows parsing JSON bodies

const corsOptions = {
  origin: "http://localhost:3000", // your frontend port
  credentials: true, // if you use cookies later
};

app.use(cors(corsOptions)); // ✅ Always active

// ▪️ Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// ▪️ Import Routes
const authRoutes = require("./src/routes/auth/authRoutes");
const usersRoutes = require("./src/routes/users/usersRoutes");
const productRoutes = require("./src/routes/products/productRoutes");
const pointsRoutes = require("./src/routes/points/pointsRoutes");
const orderRoutes = require("./src/routes/orders/orderRoutes");
const cartRoutes = require("./src/routes/cart/cartRoutes");
const wishlistRoutes = require("./src/routes/wishlist/wishlistRoutes");
const subscriptionRoutes = require("./src/routes/subscriptions/subscriptionRoutes");

// ▪️ Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/points", pointsRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api", productRoutes); // 🛠️ IMPORTANT: Mount productRoutes under '/api', NOT '/api/products'
app.use("/api", cartRoutes);
app.use("/api", wishlistRoutes);
app.use("/api", subscriptionRoutes);

// ▪️ Root Endpoint (Optional: simple welcome message)
app.get("/", (req, res) => {
  res.send("🔥 Welcome to Zone 25-14 API");
});

// ▪️ Database Connection Test + Server Start
pool
  .connect()
  .then((client) => {
    console.log("✅ Connected to PostgreSQL Database");
    client.release(); // Important! Release connection back to pool.

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ Failed to connect to PostgreSQL Database:", err.message);
    process.exit(1); // Exit the server if DB is not connected
  });
