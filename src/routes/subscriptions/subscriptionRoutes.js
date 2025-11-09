// File: src/routes/subscriptions/subscriptionRoutes.js
// This file defines the routes for subscription-related operations
// It includes routes for subscribing to niches, getting user subscriptions,
// and removing subscriptions.

const express = require("express");
const router = express.Router();
const { protectRoute } = require("../../middleware/authMiddleware");

// Subscribe to one or more niches (also sends SubscriptionActivated email for new ones)
const {
  getUserSubscriptions,
  subscribeToNiches,
  removeSubscription,
  removeSubscriptionWithPolicy,
  testSubscriptionEmail,
} = require("../../controllers/subscriptions/subscriptionController.js");

router.get("/my", protectRoute, getUserSubscriptions);
router.post("/subscribe", protectRoute, subscribeToNiches);
router.delete("/cancel/:subscriptionId", protectRoute, removeSubscription);
router.delete(
  "/cancel-policy/:subscriptionId",
  protectRoute,
  removeSubscriptionWithPolicy
);
router.post("/test-email", protectRoute, testSubscriptionEmail);

module.exports = router;
