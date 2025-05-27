// File: src/routes/users/usersRoutes.js
const express = require("express");
const router = express.Router();
const userController = require("../../controllers/users/usersController.js");
const { protectRoute } = require("../../middleware/authMiddleware");
const upload = require("../../middleware/uploadMiddleware");
const privacyRoutes = require("./userPrivacyRoutes");

// ✅ Auth routes
router.get("/profile", protectRoute, userController.getProfileOverview);
router.patch("/profile", protectRoute, userController.updateProfile);
router.patch(
  "/profile/avatar",
  protectRoute,
  upload.single("avatar"),
  userController.uploadAvatar
);
router.patch("/profile/birthday", protectRoute, userController.setBirthday);

router.get("/preferences", protectRoute, userController.getUserPreferences);
router.patch(
  "/preferences",
  protectRoute,
  userController.updateUserPreferences
);
router.use("/privacy", privacyRoutes);

// ✅ MUST BE LAST
router.get("/:username", userController.getPublicProfile);

module.exports = router;
