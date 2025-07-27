// File: src/services/activityService.js
// Description: Reusable utility for logging user activity feed entries.

const pool = require("../config/db");

/**
 * Log a new activity into the activity_feed table.
 * @param {UUID} userId - The user ID performing the activity.
 * @param {string} activity_type - Type of activity (e.g. 'title_unlocked').
 * @param {string} description - Visible description (e.g. "Unlocked 'Veteran'").
 * @param {object} metadata - Optional additional data (e.g. { title_id, product_id }).
 * @param {boolean} is_public - Whether the activity is public (default: true).
 */
const logActivity = async (
  userId,
  activity_type,
  description,
  metadata = {},
  is_public = true
) => {
  try {
    await pool.query(
      `
      INSERT INTO activity_feed (user_id, activity_type, description, metadata, is_public)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [userId, activity_type, description, metadata, is_public]
    );
  } catch (err) {
    console.error("❌ Error logging activity:", err.message);
  }
};

module.exports = { logActivity };
