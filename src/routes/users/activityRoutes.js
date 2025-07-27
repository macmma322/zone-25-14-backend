// File: src/routes/users/activityRoutes.js
// This file defines the routes for user activity-related operations.
// It includes routes for fetching user activity feeds and public activity feeds.
// It also includes routes for fetching user activity counts and public activity counts.

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/users/activityController");
const { protectRoute } = require("../../middleware/authMiddleware");

// 👤 Private activity feed for logged-in user
router.get("/", protectRoute, controller.getUserActivityFeed);

// 📊 Private activity counts for logged-in user
router.get("/counts", protectRoute, controller.getUserActivityCounts);

// 🌐 Public activity feed for any user
router.get("/public/:userId", controller.getPublicActivityFeed);

// 📊 Public activity counts for any user
router.get("/public/:userId/counts", controller.getPublicActivityCounts);

// 🗑️ Admin: Delete a specific activity by ID (optional use)
router.delete("/:activityId", controller.deleteActivity);

module.exports = router;
