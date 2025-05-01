// File: src/routes/subscriptions/subscriptionRoutes.js
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
router.get(
  "/subscriptions",
  protectRoute,
  subscriptionController.getUserSubscriptions
);

// ▪️ [Future] Get user's subscriptions
// router.get('/subscriptions', protectRoute, subscriptionController.getUserSubscriptions);

// ▪️ [Future] Cancel subscription
// router.delete('/subscriptions/:id', protectRoute, subscriptionController.cancelSubscription);

module.exports = router;
