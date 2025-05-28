// Description: Message model for handling message-related database operations
// Functions: createConversation, getConversationById
// Dependencies: pg (PostgreSQL client), db configuration
// File: src/models/conversationModel.js
const pool = require('../config/db');

const createConversation = async (isGroup, groupName, createdBy) => {
  const { rows } = await pool.query(
    `INSERT INTO conversations (is_group, group_name, created_by)
     VALUES ($1, $2, $3) RETURNING *`,
    [isGroup, groupName, createdBy]
  );
  return rows[0];
};

const getConversationById = async (id) => {
  const { rows } = await pool.query(`SELECT * FROM conversations WHERE conversation_id = $1`, [id]);
  return rows[0];
};

module.exports = {
  createConversation,
  getConversationById,
};
