// 🔁 Route Loader for Zone 25-14 Backend
// Centralizes and registers all API routes

const express = require("express");

// ─────────────────────────────────────────────
// 🔐 Core Auth & Identity
// ─────────────────────────────────────────────
const authRoutes = require("../routes/auth/authRoutes");
const userRoutes = require("../routes/users/usersRoutes");
const relationshipRoutes = require("../routes/users/relationshipRoutes");
const presenceRoutes = require("../routes/presenceRoutes");
const accountRoutes = require("../routes/users/accountsRoutes");

// ─────────────────────────────────────────────
// 🧍 User Display, Roles, Rewards
// ─────────────────────────────────────────────
const titlesRoutes = require("../routes/users/titlesRoutes");
const badgesRoutes = require("../routes/users/badgesRoutes");
const activityRoutes = require("../routes/users/activityRoutes");
const pointsRoutes = require("../routes/points/pointsRoutes");
const rolesRoutes = require("../routes/roles/rolesRoutes");

// ─────────────────────────────────────────────
// 🛒 E-Commerce & Orders
// ─────────────────────────────────────────────
const productRoutes = require("../routes/products/productRoutes");
const cartRoutes = require("../routes/cart/cartRoutes");
const wishlistRoutes = require("../routes/wishlist/wishlistRoutes");
const orderRoutes = require("../routes/orders/orderRoutes");

// ─────────────────────────────────────────────
// 📦 Subscriptions & Plans
// ─────────────────────────────────────────────
const subscriptionRoutes = require("../routes/subscriptions/subscriptionRoutes");

// ─────────────────────────────────────────────
// 💬 Messaging & Reactions
// ─────────────────────────────────────────────
const messagingRoutes = require("../routes/messaging/messagingRoutes");
const reactionRoutes = require("../routes/messaging/reactionRoutes");
const messageUploadRoutes = require("../routes/messaging/messageUploadRoutes");

// ─────────────────────────────────────────────
// 🔍 Search, Notifications, Misc
// ─────────────────────────────────────────────
const searchRoutes = require("../routes/search/searchRoutes");
const notificationRoutes = require("../routes/notifications/notificationRoutes");

// ─────────────────────────────────────────────
// 🕒 Import and run cron jobs for background tasks
// ─────────────────────────────────────────────
require("../jobs/expirationNotifications"); // This will automatically run the cron job defined in expirationNotifications.js

// ─────────────────────────────────────────────
// 🔧 Route Registration
// ─────────────────────────────────────────────
module.exports = function loadRoutes(app) {
  // 🔐 Authentication
  app.use("/api/auth", authRoutes);

  // 👤 User Systems
  app.use("/api/users", userRoutes);
  app.use("/api/users", relationshipRoutes);
  app.use("/api/presence", presenceRoutes);
  app.use("/api/users/accounts", accountRoutes);

  // 🎖️ Display, Progression, Status
  app.use("/api/users/titles", titlesRoutes);
  app.use("/api/users/badges", badgesRoutes);
  app.use("/api/users/activity", activityRoutes);
  app.use("/api/points", pointsRoutes);
  app.use("/api/roles", rolesRoutes);

  // 🛍️ E-Commerce
  app.use("/api", productRoutes);
  app.use("/api", cartRoutes);
  app.use("/api", wishlistRoutes);
  app.use("/api/orders", orderRoutes);

  // 📦 Subscriptions
  app.use("/api", subscriptionRoutes);

  // 💬 Messaging System
  app.use("/api/messaging", messagingRoutes);
  app.use("/api/reactions", reactionRoutes);
  app.use("/api/messages", messageUploadRoutes);

  // 🧾 Misc / Utilities
  app.use("/api/search", searchRoutes);
  app.use("/api/notifications", notificationRoutes);

  // 📂 Static Assets (e.g. avatars, uploads)
  app.use("/uploads", express.static("uploads"));
};
