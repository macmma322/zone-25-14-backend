// File: src/routes/subscriptions/subscriptionRoutes.js
// This file defines the routes for subscription-related operations
// It includes routes for subscribing to niches, getting user subscriptions,
// and removing subscriptions.

const express = require("express");
const router = express.Router();
const subscriptionController = require("../../controllers/subscriptions/subscriptionController");
const { protectRoute } = require("../../middleware/authMiddleware");

// ▪️ Subscribe to one or more niches
router.post(
  "/subscriptions",
  protectRoute,
  subscriptionController.subscribeToNiches
);

// ▪️ Get user's subscriptions
router.get(
  "/subscriptions",
  protectRoute,
  subscriptionController.getUserSubscriptions
);

// ▪️ Remove subscription (mark as inactive)
router.delete(
  "/subscriptions/:subscriptionId",
  protectRoute,
  subscriptionController.removeSubscription
);

module.exports = router;
