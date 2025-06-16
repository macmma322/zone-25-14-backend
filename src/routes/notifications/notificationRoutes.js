// routes/notifications/notificationRoutes.js
const express = require("express");
const router = express.Router();

const { protectRoute } = require("../../middleware/authMiddleware");
const {
  createNotification,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} = require("../../controllers/notifications/notificationController");

// 🛠 Define routes
router.post("/", protectRoute, createNotification);
router.get("/", protectRoute, getUserNotifications);
router.patch("/:id", protectRoute, markNotificationRead);
router.patch("/mark-all", protectRoute, markAllNotificationsRead);
router.delete("/:id", protectRoute, deleteNotification);

module.exports = router;
