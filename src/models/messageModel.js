// Description: Message model for handling message-related database operations
// Functions: sendMessage, getMessagesByConversation
// Dependencies: pg (PostgreSQL client), db configuration
// File: src/models/messageModel.js
const pool = require("../config/db");

const sendMessage = async (
  conversationId,
  senderId,
  content,
  replyToId = null,
  mediaUrl = null,
  mediaType = null
) => {
  const { rows } = await pool.query(
    `INSERT INTO messages (conversation_id, sender_id, content, reply_to_id, media_url, media_type)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [conversationId, senderId, content, replyToId, mediaUrl, mediaType]
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

const getPaginatedMessages = async (
  conversationId,
  beforeId = null,
  limit = 30
) => {
  let query = `
    SELECT m.*, u.username
    FROM messages m
    JOIN users u ON u.user_id = m.sender_id
    WHERE m.conversation_id = $1 AND m.is_deleted = false
  `;
  const values = [conversationId];

  if (beforeId) {
    query += ` AND m.sent_at < (SELECT sent_at FROM messages WHERE message_id = $2)`;
    values.push(beforeId);
  }

  query += ` ORDER BY m.sent_at DESC LIMIT $${values.length + 1}`;

  const { rows } = await pool.query(query, values);
  return rows;
};

module.exports = {
  sendMessage,
  getMessagesByConversation,
  getPaginatedMessages,
};
