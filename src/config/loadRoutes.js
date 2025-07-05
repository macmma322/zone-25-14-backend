// 🔁 Route Loader for Zone 25-14 Backend
// Centralizes and registers all API routes

const authRoutes = require("../routes/auth/authRoutes");
const userRoutes = require("../routes/users/usersRoutes");
const relationshipRoutes = require("../routes/users/relationshipRoutes");
const pointsRoutes = require("../routes/points/pointsRoutes");
const rolesRoutes = require("../routes/roles/rolesRoutes");

const productRoutes = require("../routes/products/productRoutes");
const cartRoutes = require("../routes/cart/cartRoutes");
const wishlistRoutes = require("../routes/wishlist/wishlistRoutes");
const orderRoutes = require("../routes/orders/orderRoutes");

const subscriptionRoutes = require("../routes/subscriptions/subscriptionRoutes");

const messagingRoutes = require("../routes/messaging/messagingRoutes");
const reactionRoutes = require("../routes/messaging/reactionRoutes");

const searchRoutes = require("../routes/search/search");
const notificationRoutes = require("../routes/notifications/notificationRoutes");

module.exports = function loadRoutes(app) {
  // 🔐 Auth
  app.use("/api/auth", authRoutes);

  // 👤 Users
  app.use("/api/users", userRoutes);
  app.use("/api/users", relationshipRoutes);

  // 🎯 Points & Roles
  app.use("/api/points", pointsRoutes);
  app.use("/api/roles", rolesRoutes);

  // 🛍️ E-Commerce
  app.use("/api", productRoutes);
  app.use("/api", cartRoutes);
  app.use("/api", wishlistRoutes);
  app.use("/api/orders", orderRoutes);

  // 📦 Subscriptions
  app.use("/api", subscriptionRoutes);

  // 💬 Messaging
  app.use("/api/messaging", messagingRoutes);
  app.use("/api/reactions", reactionRoutes);

  // 🔍 Search
  app.use("/api/search", searchRoutes);

  // 🔔 Notifications
  app.use("/api/notifications", notificationRoutes);
};
