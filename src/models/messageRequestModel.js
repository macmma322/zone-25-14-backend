// Description: Message model for handling message-related database operations
// Functions: createMessageRequest, getRequestsForUser, updateRequestStatus, getRequestById
// Dependencies: pg (PostgreSQL client), db configuration
// File: src/models/messageRequestModel.js
const pool = require("../config/db");

const createMessageRequest = async (senderId, receiverId, content) => {
  const { rows } = await pool.query(
    `INSERT INTO message_requests (sender_id, receiver_id, content)
     VALUES ($1, $2, $3) RETURNING *`,
    [senderId, receiverId, content]
  );
  return rows[0];
};

const getRequestsForUser = async (userId) => {
  const { rows } = await pool.query(
    `SELECT * FROM message_requests
     WHERE receiver_id = $1 AND status = 'pending'
     ORDER BY sent_at DESC`,
    [userId]
  );
  return rows;
};

const updateRequestStatus = async (requestId, status) => {
  const { rows } = await pool.query(
    `UPDATE message_requests SET status = $1 WHERE request_id = $2 RETURNING *`,
    [status, requestId]
  );
  return rows[0];
};

const getRequestById = async (id) => {
  const { rows } = await pool.query(
    `SELECT * FROM message_requests WHERE request_id = $1`,
    [id]
  );
  return rows[0];
};

module.exports = {
  createMessageRequest,
  getRequestsForUser,
  updateRequestStatus,
  getRequestById,
};
