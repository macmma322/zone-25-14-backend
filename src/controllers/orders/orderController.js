const { createOrder } = require('../../models/orderModel');
const { updateUserPointsAndRole, getPointsMultiplier } = require('../../services/loyalty/loyaltyService');

const placeOrder = async (req, res) => {
  try {
    const { totalPrice } = req.body;
    const userId = req.user.userId;

    if (!totalPrice || totalPrice <= 0) {
      return res.status(400).json({ message: 'Total price must be greater than 0.' });
    }

    // 💎 Use loyalty service to get multiplier
    const multiplier = await getPointsMultiplier(userId);
    const basePoints = Math.floor(totalPrice);
    const earnedPoints = Math.floor(basePoints * multiplier);

    // ✅ Create the order
    const order = await createOrder(userId, totalPrice, earnedPoints);

    // 🧠 Reward points + check for auto-promotion
    await updateUserPointsAndRole(userId, earnedPoints);

    res.status(201).json({
      message: 'Order placed successfully!',
      order,
      points_earned: earnedPoints,
      multiplier_applied: multiplier
    });

  } catch (err) {
    console.error('Order Creation Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  placeOrder,
};
