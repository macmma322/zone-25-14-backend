const { createOrder } = require('../models/orderModel');
const { updateUserPointsAndRole } = require('../services/loyaltyService');

// Create order and reward points
const placeOrder = async (req, res) => {
  try {
    const { totalPrice } = req.body;

    if (!totalPrice) {
      return res.status(400).json({ message: 'Total price is required.' });
    }

    // 1 point per $1 spent (you can adjust this multiplier)
    const earnedPoints = Math.floor(totalPrice * 1);

    // Create order
    const order = await createOrder(req.user.userId, totalPrice, earnedPoints);

    // Reward points + check for promotion
    await updateUserPointsAndRole(req.user.userId, earnedPoints);

    res.status(201).json({
      message: 'Order placed successfully!',
      order,
      points_earned: earnedPoints,
    });

  } catch (err) {
    console.error('Order Creation Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  placeOrder,
};
