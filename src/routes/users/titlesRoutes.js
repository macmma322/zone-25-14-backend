// File: src/routes/users/titlesRoutes.js
// This file defines the routes for managing user titles.
// It includes routes for getting all titles, user-specific titles, unlocking titles, and setting display titles.
// It uses the express router to handle requests and the database to store and retrieve data.

const express = require("express");
const router = express.Router();
const controller = require("../../controllers/users/titlesController");
const { protectRoute } = require("../../middleware/authMiddleware");

// ✅ Get all available titles
router.get("/", controller.getAllTitles);

// ✅ Get all available titles for a user
router.get("/my", protectRoute, controller.getUserUnlockedTitles);

// ✅ Unlock a title for a user (admin or achievement logic)
router.post("/unlock", protectRoute, controller.unlockTitleForUser);

// ✅ Set a title as the user's display title
router.patch("/select", protectRoute, controller.setSelectedTitle);

// ✅ Remove a title from a user (admin)
router.delete("/remove", protectRoute, controller.removeUserTitle); // Optional admin

module.exports = router;
