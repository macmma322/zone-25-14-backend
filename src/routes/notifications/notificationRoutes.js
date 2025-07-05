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
  deleteAllNotifications,
  deleteMultipleNotifications,
  updateNotificationStatus,
} = require("../../controllers/notifications/notificationController");

// 🔔 CREATE
router.post("/", protectRoute, createNotification);

// 📥 FETCH
router.get("/", protectRoute, getUserNotifications);

// ✅ UPDATE
router.patch("/mark-all", protectRoute, markAllNotificationsRead);
router.patch("/:id", protectRoute, markNotificationRead);
router.post("/:id/status", protectRoute, updateNotificationStatus); // Optional route for status

// 🗑️ DELETE
router.delete("/clear-all", protectRoute, deleteAllNotifications);
router.post("/clear-selected", protectRoute, deleteMultipleNotifications);
router.delete("/:id", protectRoute, deleteNotification); // ❗️Placed last to avoid conflicts

module.exports = router;
