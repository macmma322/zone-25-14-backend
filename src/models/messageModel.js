// Description: Message model for handling message-related database operations
// Functions: sendMessage, getMessagesByConversation
// Dependencies: pg (PostgreSQL client), db configuration
// File: src/models/messageModel.js
const pool = require('../config/db');

const sendMessage = async (conversationId, senderId, content) => {
  const { rows } = await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, content)
     VALUES ($1, $2, $3) RETURNING *`,
    [conversationId, senderId, content]
  );
  return rows[0];
};

const getMessagesByConversation = async (conversationId, limit = 50) => {
  const { rows } = await pool.query(
    `SELECT m.*, u.username FROM messages m
     JOIN users u ON u.user_id = m.sender_id
     WHERE m.conversation_id = $1 AND is_deleted = false
     ORDER BY sent_at DESC
     LIMIT $2`,
    [conversationId, limit]
  );
  return rows;
};

module.exports = {
  sendMessage,
  getMessagesByConversation,
};
