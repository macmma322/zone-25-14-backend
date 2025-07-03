// File: zone-25-14-backend/src/routes/notifications/notificationRoutes.js
// This file is part of the Zone 25-14 project.
// Licensed under the GNU General Public License v3.0.
// Description: Handles routes for user notifications
// Functions: createNotification, getUserNotifications, markNotificationRead, markAllNotificationsRead,
//            deleteNotification
// Dependencies: Express, auth middleware, notification controller functions
// Note: Order of routes matters, so place more specific routes before generic ones

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

// 🛠 Define routes (ORDER MATTERS)
router.post("/", protectRoute, createNotification);
router.get("/", protectRoute, getUserNotifications);

// ✅ Place this ABOVE `/:id` to avoid conflict
router.patch("/mark-all", protectRoute, markAllNotificationsRead);

router.patch("/:id", protectRoute, markNotificationRead);
router.delete("/:id", protectRoute, deleteNotification);

module.exports = router;
