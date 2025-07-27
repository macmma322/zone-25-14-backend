// zone-25-14-backend/src/models/orderModel.js
// This file contains functions to manage orders in the database
// including creating, retrieving, updating, and canceling orders.
// It uses PostgreSQL for database operations.

const pool = require("../config/db");

// Create new order
const createOrder = async (userId, totalPrice, earnedPoints, orderItems) => {
  const query = `
    INSERT INTO orders (user_id, total_price, earned_points, payment_status, order_status)
    VALUES ($1, $2, $3, 'paid', 'processing')
    RETURNING order_id, user_id, total_price, earned_points;
  `;
  const values = [userId, totalPrice, earnedPoints];
  const { rows } = await pool.query(query, values);
  const orderId = rows[0].order_id;

  // Insert order items into the order_items table
  for (const item of orderItems) {
    const itemQuery = `
      INSERT INTO order_items (order_id, product_id, variation_id, quantity, price_each)
      VALUES ($1, $2, $3, $4, $5);
    `;
    const itemValues = [
      orderId,
      item.product_id,
      item.variation_id,
      item.quantity,
      item.price_each,
    ];
    await pool.query(itemQuery, itemValues);
  }

  return rows[0]; // Return the created order object with the necessary details
};

// Get order by ID
const getOrderById = async (orderId) => {
  const query = `
    SELECT * FROM orders WHERE order_id = $1;
  `;
  const { rows } = await pool.query(query, [orderId]);
  return rows[0]; // Return a single order object
};

// Get orders by user ID
const getUserOrders = async (userId) => {
  const query = `
    SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC;
  `;
  const { rows } = await pool.query(query, [userId]);
  return rows; // Return an array of orders
};

// Update order details (e.g., total price, order status)
const updateOrderInDb = async (orderId, { orderStatus, totalPrice }) => {
  const query = `
    UPDATE orders 
    SET order_status = $1, total_price = $2 
    WHERE order_id = $3
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [orderStatus, totalPrice, orderId]);
  return rows[0]; // Return the updated order object
};

// Cancel the order (set status to 'canceled')
const cancelOrderInDb = async (orderId) => {
  const query = `
    UPDATE orders 
    SET order_status = 'canceled' 
    WHERE order_id = $1
    RETURNING *;
  `;
  const { rows } = await pool.query(query, [orderId]);
  return rows[0]; // Return the canceled order object
};

// Update or add items to an existing order (optional)
const updateOrderItems = async (orderId, orderItems) => {
  // Assuming we are updating quantities or adding/removing items
  for (const item of orderItems) {
    const query = `
      INSERT INTO order_items (order_id, product_id, variation_id, quantity, price_each)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (order_id, product_id, variation_id) 
      DO UPDATE SET quantity = EXCLUDED.quantity, price_each = EXCLUDED.price_each;
    `;
    const values = [
      orderId,
      item.product_id,
      item.variation_id,
      item.quantity,
      item.price_each,
    ];
    await pool.query(query, values);
  }

  // Optionally, return the updated order items
  const updatedItemsQuery = `
    SELECT * FROM order_items WHERE order_id = $1;
  `;
  const { rows } = await pool.query(updatedItemsQuery, [orderId]);
  return rows; // Return the updated items
};

module.exports = {
  createOrder,
  getOrderById,
  getUserOrders,
  updateOrderInDb,
  cancelOrderInDb,
  updateOrderItems,
};
