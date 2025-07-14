// zone-25-14-backend/src/controllers/orders/orderController.js
// Description: Handles order placement, including loyalty points and notifications
// Functions: placeOrder

const { createOrder } = require("../../models/orderModel");
const {
  updateUserPointsAndRole,
  getPointsMultiplier,
} = require("../../services/loyalty/loyaltyService");
const { sendNotification } = require("../../services/notificationService");

// ✅ Place an order
const placeOrder = async (req, res) => {
  try {
    const { totalPrice } = req.body;
    const userId = req.user.userId;

    if (!totalPrice || totalPrice <= 0) {
      return res
        .status(400)
        .json({ message: "Total price must be greater than 0." });
    }

    // 💎 Calculate points
    const multiplier = await getPointsMultiplier(userId);
    const basePoints = Math.floor(totalPrice);
    const earnedPoints = Math.floor(basePoints * multiplier);

    // ✅ Create the order
    const order = await createOrder(userId, totalPrice, earnedPoints);

    // 🧠 Apply loyalty logic
    await updateUserPointsAndRole(userId, earnedPoints);

    // 🔔 Send Notification
    await sendNotification(
      userId,
      "order",
      "Your order has been placed successfully!",
      `/orders/${order.order_id}`,
      {
        status: "Awaiting fulfillment",
        points: `${earnedPoints} points earned`,
        total: `Total: ${totalPrice.toFixed(2)} лв`,
      }
    );

    res.status(201).json({
      message: "Order placed successfully!",
      order,
      points_earned: earnedPoints,
      multiplier_applied: multiplier,
    });
  } catch (err) {
    console.error("Order Creation Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  placeOrder,
};
