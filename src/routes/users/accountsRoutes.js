// File: zone-25-14-backend/src/routes/users/accountsRoutes.js
// This file defines the routes for managing user social links.
// It includes routes for getting and updating user social links.

const express = require("express");
const router = express.Router();
const accountController = require("../../controllers/users/accountsController");
const { protectRoute } = require("../../middleware/authMiddleware");

// ✅ Get all linked accounts and social links for the user
router.get("/", protectRoute, accountController.getUserAccounts);

// ✅ Get current user's social links
router.get("/socials", protectRoute, accountController.getOnlySocialLinks); // Add this

// ✅ Link a new external account (OAuth or third-party)
router.post("/link", protectRoute, accountController.linkExternalAccount);

// ✅ Update or insert social links (Instagram, YouTube, etc.)
router.patch("/socials", protectRoute, accountController.updateSocialLinks);

// ✅ Unlink an external account
router.delete(
  "/unlink/:provider",
  protectRoute,
  accountController.unlinkExternalAccount
);

module.exports = router;
