const pool = require('../config/db');

// Create new order
const createOrder = async (userId, totalPrice, earnedPoints) => {
  const query = `
    INSERT INTO orders (user_id, total_price, earned_points, payment_status, order_status)
    VALUES ($1, $2, $3, 'paid', 'processing')
    RETURNING *;
  `;
  const values = [userId, totalPrice, earnedPoints];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

module.exports = {
  createOrder,
};
