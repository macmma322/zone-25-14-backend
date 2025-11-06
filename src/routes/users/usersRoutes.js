// File: src/routes/users/usersRoutes.js
// This file defines the routes for user-related operations,
// including profile management, preferences, privacy, socials, and display settings.

const express = require("express");
const router = express.Router();
const userController = require("../../controllers/users/usersController.js");
const { protectRoute } = require("../../middleware/authMiddleware");
const { uploadAvatar } = require("../../middleware/uploadMiddleware");
const privacyRoutes = require("./userPrivacyRoutes");
const accountsRoutes = require("./accountsRoutes");

// 👤 Profile
router.get("/profile", protectRoute, userController.getProfileOverview);
router.patch("/profile", protectRoute, userController.updateProfile);
router.patch(
  "/profile/avatar",
  protectRoute,
  uploadAvatar.single("avatar"),
  userController.uploadAvatar
);
router.patch("/profile/birthday", protectRoute, userController.setBirthday);

// ✍️ Biography
router.patch("/bio", protectRoute, userController.updateBiography);

// 🌐 Preferences
router.get("/preferences", protectRoute, userController.getUserPreferences);
router.patch(
  "/preferences",
  protectRoute,
  userController.updateUserPreferences
);

// 🔐 Privacy
router.use("/privacy", privacyRoutes);

// 🔗 Social Links
router.get("/socials", protectRoute, userController.getUserSocialLinks);
router.patch("/socials", protectRoute, userController.updateUserSocialLinks);

// 🎖️ Display (Title + Badge)
router.get("/display", protectRoute, userController.getDisplayPreferences);
router.patch("/display", protectRoute, userController.updateDisplayPreferences);

// Linked Accounts
router.use("/linked", accountsRoutes);

// 👁️ Public Profile
router.get("/:username", userController.getPublicProfile);

module.exports = router;
