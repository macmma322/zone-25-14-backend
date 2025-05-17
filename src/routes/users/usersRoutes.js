// File: src/routes/users/usersRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../../controllers/users/usersController.js");
const { protectRoute } = require("../../middleware/authMiddleware");
const upload = require("../../middleware/uploadMiddleware");
const privacyRoutes = require("./userPrivacyRoutes");

// ✅ Get full profile overview
router.get("/profile", protectRoute, userController.getProfileOverview);
// ✅ Public profile view by username
router.get("/:username", userController.getPublicProfile);

// ✅ Update username
router.patch("/profile", protectRoute, userController.updateProfile);

// ✅ Upload avatar image
router.patch(
  "/profile/avatar",
  protectRoute,
  upload.single("avatar"),
  userController.uploadAvatar
);

// ✅ Set birthday (only once)
router.patch("/profile/birthday", protectRoute, userController.setBirthday);

// ✅ User Preferences
router.get("/preferences", protectRoute, userController.getUserPreferences);
router.patch(
  "/preferences",
  protectRoute,
  userController.updateUserPreferences
);

router.use("/privacy", privacyRoutes);

module.exports = router;
