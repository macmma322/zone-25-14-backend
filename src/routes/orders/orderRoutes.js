// zone-25-14-backend/src/routes/orders/orderRoutes.js
// This file defines the routes for order-related operations
// including placing, canceling, updating, and retrieving orders.

const express = require("express");
const { protectRoute } = require("../../middleware/authMiddleware");
const { adminProtect } = require("../../middleware/adminMiddleware");
const {
  placeOrder,
  cancelOrder,
  updateOrderStatus,
  getOrderByIdController,
  getUserOrdersController,
} = require("../../controllers/orders/orderController");

const router = express.Router();

// User places order
router.post("/", protectRoute, placeOrder);

// Get order by ID (user or admin)
router.get("/:orderId", protectRoute, getOrderByIdController);

// Get all orders for the authenticated user
router.get("/history", protectRoute, getUserOrdersController);

// Admin only: Update order status
router.patch("/:orderId/status", protectRoute, adminProtect, updateOrderStatus);

// Cancel an order (user or admin)
router.delete("/:orderId/cancel", protectRoute, cancelOrder);

module.exports = router;
