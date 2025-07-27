// zone-25-14-backend/src/controllers/users/activityController.js
// This file contains the controller functions for managing user activity feeds.
// It handles fetching activity feeds, logging activities, deleting activities, and returning activity counts.

const pool = require("../../config/db");

// ✅ GET activity feed for logged-in user
const getUserActivityFeed = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(
      `
      SELECT activity_id, activity_type, description, metadata, created_at
      FROM activity_feed
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching user activity feed:", err.message);
    res.status(500).json({ message: "Failed to fetch activity feed." });
  }
};

// ✅ GET counts of activity types for logged-in user
const getUserActivityCounts = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(
      `
      SELECT activity_type, COUNT(*) AS count
      FROM activity_feed
      WHERE user_id = $1
      GROUP BY activity_type
    `,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching activity counts:", err.message);
    res.status(500).json({ message: "Failed to fetch activity counts." });
  }
};

// ✅ GET public activity feed for a user by ID
const getPublicActivityFeed = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT activity_id, activity_type, description, metadata, created_at
      FROM activity_feed
      WHERE user_id = $1 AND is_public = TRUE
      ORDER BY created_at DESC
      LIMIT 50
    `,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching public activity feed:", err.message);
    res.status(500).json({ message: "Failed to fetch public activity feed." });
  }
};

// ✅ GET public activity counts for a user by ID
const getPublicActivityCounts = async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT activity_type, COUNT(*) AS count
      FROM activity_feed
      WHERE user_id = $1 AND is_public = TRUE
      GROUP BY activity_type
    `,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching public activity counts:", err.message);
    res
      .status(500)
      .json({ message: "Failed to fetch public activity counts." });
  }
};

// ✅ INTERNAL: log activity (used in titles, badges, etc.)
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

// ✅ DELETE an activity (optional, admin use)
const deleteActivity = async (req, res) => {
  const { activityId } = req.params;

  try {
    await pool.query(`DELETE FROM activity_feed WHERE activity_id = $1`, [
      activityId,
    ]);

    res.status(200).json({ message: "Activity deleted." });
  } catch (err) {
    console.error("❌ Error deleting activity:", err.message);
    res.status(500).json({ message: "Failed to delete activity." });
  }
};

module.exports = {
  getUserActivityFeed,
  getUserActivityCounts,
  getPublicActivityFeed,
  getPublicActivityCounts,
  logActivity,
  deleteActivity,
};
