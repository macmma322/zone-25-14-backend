// File: src/routes/users/badgesRoutes.js
// This file defines the routes for managing user badges.
// It includes routes for getting all badges, user-specific badges, unlocking badges, and setting display badges.
// It uses the badgesController to handle the logic.

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/users/badgesController");
const { protectRoute } = require("../../middleware/authMiddleware");

// ✅ Get all badges
router.get("/", controller.getAllBadges);

// ✅ Get all available badges for a user
router.get("/my", protectRoute, controller.getUserUnlockedBadges);

// ✅ Unlock a badge for a user (admin or achievement logic)
router.post("/unlock", protectRoute, controller.unlockBadgeForUser);

// ✅ Set a badge as the user's display badge
router.patch("/select", protectRoute, controller.setSelectedBadge);

// ✅ Remove a badge from a user (admin)
router.delete("/remove", protectRoute, controller.removeUserBadge); // Optional admin

module.exports = router;
