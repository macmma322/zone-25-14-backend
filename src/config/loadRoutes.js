// 🔁 Route Loader for Zone 25-14 Backend
// Centralizes and registers all API routes

// ─────────────────────────────────────────────//
//                  Imports                     //
// ─────────────────────────────────────────────//
const express = require("express");
// ─────────────────────────────────────────────
// Core
// ─────────────────────────────────────────────
const authRoutes = require("../routes/auth/authRoutes");
const userRoutes = require("../routes/users/usersRoutes");
const presenceRoutes = require("../routes/presenceRoutes");
// ─────────────────────────────────────────────
const relationshipRoutes = require("../routes/users/relationshipRoutes");
const pointsRoutes = require("../routes/points/pointsRoutes");
const rolesRoutes = require("../routes/roles/rolesRoutes");
// ─────────────────────────────────────────────
// E-Commerce
// ─────────────────────────────────────────────
const productRoutes = require("../routes/products/productRoutes");
const cartRoutes = require("../routes/cart/cartRoutes");
const wishlistRoutes = require("../routes/wishlist/wishlistRoutes");
const orderRoutes = require("../routes/orders/orderRoutes");
// ─────────────────────────────────────────────
// Subscriptions
// ─────────────────────────────────────────────
const subscriptionRoutes = require("../routes/subscriptions/subscriptionRoutes");
// ─────────────────────────────────────────────
// Messaging
// ─────────────────────────────────────────────
const messagingRoutes = require("../routes/messaging/messagingRoutes");
const reactionRoutes = require("../routes/messaging/reactionRoutes");
// ─────────────────────────────────────────────
// Search
// ─────────────────────────────────────────────
const searchRoutes = require("../routes/search/search");
const notificationRoutes = require("../routes/notifications/notificationRoutes");
const messageUploadRoutes = require("../routes/messaging/messageUploadRoutes");
// ─────────────────────────────────────────────

module.exports = function loadRoutes(app) {
  // 🔐 Auth
  app.use("/api/auth", authRoutes);

  // 👤 Users
  app.use("/api/users", userRoutes);
  app.use("/api/users", relationshipRoutes);

  // 🏆 User Presence
  app.use("/api/presence", presenceRoutes);

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
  app.use("/api/messages", messageUploadRoutes);

  // Serve static media
  app.use("/uploads", express.static("uploads"));

  // 🔍 Search
  app.use("/api/search", searchRoutes);

  // 🔔 Notifications
  app.use("/api/notifications", notificationRoutes);
};
