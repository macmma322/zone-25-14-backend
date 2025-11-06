// File: src/routes/subscriptions/subscriptionRoutes.js
// This file defines the routes for subscription-related operations
// It includes routes for subscribing to niches, getting user subscriptions,
// and removing subscriptions.

const express = require("express");
const router = express.Router();
const subscriptionController = require("../../controllers/subscriptions/subscriptionController");
const { protectRoute } = require("../../middleware/authMiddleware");

// Subscribe to one or more niches (also sends SubscriptionActivated email for new ones)
router.post(
  "/subscriptions",
  protectRoute,
  subscriptionController.subscribeToNiches
);

// Get user's active subscriptions
router.get(
  "/subscriptions",
  protectRoute,
  subscriptionController.getUserSubscriptions
);

// Cancel subscription
router.delete(
  "/subscriptions/:subscriptionId",
  protectRoute,
  subscriptionController.removeSubscription
);

// (Optional) Dev-only: send a test “subscription activated” email (no DB writes)
router.post(
  "/test-email",
  protectRoute,
  subscriptionController.testSubscriptionEmail
);

module.exports = router;
