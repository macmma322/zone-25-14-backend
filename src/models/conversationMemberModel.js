// Description: Message model for handling message-related database operations
// Functions: createConversation, getConversationById
// Dependencies: pg (PostgreSQL client), db configuration
// File: src/models/conversationModel.js
const pool = require("../config/db");

const addMemberToConversation = async (
  conversationId,
  userId,
  role = "member"
) => {
  const { rows } = await pool.query(
    `INSERT INTO conversation_members (conversation_id, user_id, role)
     VALUES ($1, $2, $3) RETURNING *`,
    [conversationId, userId, role]
  );
  return rows[0];
};

const getConversationMembers = async (conversationId) => {
  const { rows } = await pool.query(
    `SELECT u.user_id, u.username, cm.role
     FROM conversation_members cm
     JOIN users u ON u.user_id = cm.user_id
     WHERE cm.conversation_id = $1`,
    [conversationId]
  );
  return rows;
};

module.exports = {
  addMemberToConversation,
  getConversationMembers,
};
