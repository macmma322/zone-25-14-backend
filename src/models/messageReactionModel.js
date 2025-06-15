// This file is part of the Zone 25 project, which is licensed under the GNU General Public License v3.0.
// Description: Message reaction model for handling message reaction-related database operations
// Functions: addReaction
// Dependencies: pg (PostgreSQL client), db configuration
// File: src/models/messageReactionModel.js

const pool = require("../config/db");

const addReaction = async (messageId, userId, reaction) => {
  const { rows } = await pool.query(
    `INSERT INTO message_reactions (message_id, user_id, reaction)
     VALUES ($1, $2, $3) RETURNING *`,
    [messageId, userId, reaction]
  );
  return rows[0];
};

const toggleReaction = async (messageId, userId, reaction) => {
  const existing = await pool.query(
    `SELECT * FROM message_reactions
     WHERE message_id = $1 AND user_id = $2 AND reaction = $3`,
    [messageId, userId, reaction]
  );

  if (existing.rows.length > 0) {
    // Reaction exists — remove it (toggle off)
    await pool.query(
      `DELETE FROM message_reactions
       WHERE message_id = $1 AND user_id = $2 AND reaction = $3`,
      [messageId, userId, reaction]
    );
    return { toggled: "removed" };
  } else {
    // Reaction doesn't exist — add it (toggle on)
    const { rows } = await pool.query(
      `INSERT INTO message_reactions (message_id, user_id, reaction)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [messageId, userId, reaction]
    );
    return { toggled: "added", reaction: rows[0] };
  }
};

module.exports = {
  addReaction,
  toggleReaction,
};
