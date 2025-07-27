// zone-25-14-backend/src/controllers/orders/orderController.js
// This file contains the logic for handling order-related requests
// such as placing, canceling, updating, and retrieving orders.
// It interacts with the order model for database operations
// and uses notification service to send updates to users.
// It also includes middleware for user authentication and admin protection.
// It uses Express.js for routing and handling HTTP requests.

const {
  getOrderById: getOrderByIdModel,
  createOrder,
  updateOrderInDb,
  cancelOrderInDb,
  getUserOrders: getUserOrdersModel,
  updateOrderItems,
} = require("../../models/orderModel");
const { sendNotification } = require("../../services/notificationService");

// ✅ Place an order
const placeOrder = async (req, res) => {
  const { totalPrice, orderItems } = req.body;
  const userId = req.user.user_id;

  try {
    if (!totalPrice || totalPrice <= 0) {
      return res.status(400).json({
        message: "Total price must be greater than 0.",
        success: false,
      });
    }

    // Create the order
    const order = await createOrder(userId, totalPrice, orderItems);

    // Send confirmation notification to the user
    await sendNotification(
      userId,
      "order",
      "Your order has been placed successfully!",
      `/orders/${order.order_id}`,
      { status: "Pending", total: `Total: ${totalPrice.toFixed(2)} лв` }
    );

    res.status(201).json({
      message: "Order placed successfully!",
      success: true,
      order,
    });
  } catch (err) {
    console.error("Order Creation Error:", err.message);
    res.status(500).json({
      message: "Server error",
      success: false,
    });
  }
};

// ✅ Cancel an order (user or admin)
const cancelOrder = async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.user_id;

  try {
    const order = await getOrderByIdModel(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found.", success: false });
    }

    // Ensure only the user who placed the order or an admin can cancel it
    if (order.user_id !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        message: "You are not authorized to cancel this order.",
        success: false,
      });
    }

    if (
      order.order_status === "Shipped" ||
      order.order_status === "Delivered"
    ) {
      return res.status(400).json({
        message: "Order cannot be canceled after shipment.",
        success: false,
      });
    }

    // Proceed with cancellation: Update order status to 'canceled'
    await cancelOrderInDb(orderId);

    // Send cancellation notification to the user
    await sendNotification(
      userId,
      "order",
      "Your order has been canceled.",
      `/orders/${orderId}`,
      { status: "Canceled" }
    );

    res
      .status(200)
      .json({ message: "Order canceled successfully.", success: true });
  } catch (err) {
    console.error("Cancel Order Error:", err.message);
    res.status(500).json({
      message: "Server error",
      success: false,
    });
  }
};

// ✅ Update an order (admin only)
const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { orderStatus } = req.body;

  try {
    const order = await getOrderByIdModel(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found.", success: false });
    }

    // Admins can update the order status
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Forbidden: Only admin can update orders.",
        success: false,
      });
    }

    // Update the order's status
    const updatedOrder = await updateOrderInDb(orderId, {
      orderStatus,
    });

    res.status(200).json({
      message: "Order status updated successfully.",
      success: true,
      order: updatedOrder,
    });
  } catch (err) {
    console.error("Update Order Error:", err.message);
    res.status(500).json({
      message: "Server error",
      success: false,
    });
  }
};

// ✅ Get order by ID (view order details) - only user or admin
const getOrderByIdController = async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.user_id;

  try {
    const order = await getOrderByIdModel(orderId);

    if (!order) {
      return res
        .status(404)
        .json({ message: "Order not found.", success: false });
    }

    // Ensure only the user who placed the order or an admin can view it
    if (order.user_id !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        message: "You are not authorized to view this order.",
        success: false,
      });
    }

    res.status(200).json({ order, success: true });
  } catch (err) {
    console.error("Get Order Error:", err.message);
    res.status(500).json({
      message: "Server error",
      success: false,
    });
  }
};

// ✅ Get all orders for a user
const getUserOrdersController = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const orders = await getUserOrdersModel(userId);

    res.status(200).json({ orders, success: true });
  } catch (err) {
    console.error("Get User Orders Error:", err.message);
    res.status(500).json({
      message: "Server error",
      success: false,
    });
  }
};

module.exports = {
  placeOrder,
  cancelOrder,
  updateOrderStatus,
  getOrderByIdController,
  getUserOrdersController,
};
