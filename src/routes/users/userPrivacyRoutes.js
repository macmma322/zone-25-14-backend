// File: src/routes/users/userPrivacyRoutes.js
// This file defines the routes for managing user privacy settings.
// It includes routes for getting and updating privacy settings.
// It uses the userPrivacyController to handle the logic.
// It uses the protectRoute middleware to ensure only authenticated users can access these routes.
// It is imported in the main usersRoutes file.

const express = require("express");
const router = express.Router();
const { protectRoute } = require("../../middleware/authMiddleware");
const privacyController = require("../../controllers/users/userPrivacyController");

// ✅ GET user privacy settings
router.get("/", protectRoute, privacyController.getPrivacySettings);
// ✅ UPDATE user privacy settings
router.patch("/", protectRoute, privacyController.updatePrivacySettings);

module.exports = router;
