// zone-25-14-backend/src/controllers/users/badgesController.js
// This file contains the controller functions for managing user badges.
// It handles fetching all badges, user-specific badges, unlocking badges, and setting display badges.
// It also handles fetching all unlocked badges and setting the display badge for a user.
// It uses the services provided by the services module to interact with the database and perform business logic.

const pool = require("../../config/db");
const { logActivity } = require("../../services/activityService"); // ✅ Log integration

// ✅ Get all available badges
const getAllBadges = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT badge_id, badge_name, description, icon, is_exclusive
      FROM badges
      ORDER BY created_at DESC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Get All Badges Error:", err.message);
    res.status(500).json({ message: "Failed to fetch badges." });
  }
};

// ✅ Get unlocked badges for current user
const getUserUnlockedBadges = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(
      `
      SELECT b.badge_id, b.badge_name, b.description, b.icon, ub.unlocked_at
      FROM user_badges ub
      JOIN badges b ON b.badge_id = ub.badge_id
      WHERE ub.user_id = $1
      ORDER BY ub.unlocked_at DESC
    `,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Get User Badges Error:", err.message);
    res.status(500).json({ message: "Failed to fetch user badges." });
  }
};

// ✅ Unlock a badge for a user (admin or achievement logic)
const unlockBadgeForUser = async (req, res) => {
  const { user_id, badge_id } = req.body;

  try {
    const inserted = await pool.query(
      `
      INSERT INTO user_badges (user_id, badge_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      RETURNING *
    `,
      [user_id, badge_id]
    );

    if (inserted.rowCount > 0) {
      const badgeInfo = await pool.query(
        `SELECT badge_name FROM badges WHERE badge_id = $1`,
        [badge_id]
      );

      const badgeName = badgeInfo.rows[0]?.badge_name || "a badge";

      // ✅ Log badge earn activity
      await logActivity(
        user_id,
        "badge_earned",
        `Earned the badge ‘${badgeName}’`,
        { badge_id }
      );
    }

    res.status(200).json({ message: "Badge unlocked successfully." });
  } catch (err) {
    console.error("❌ Unlock Badge Error:", err.message);
    res.status(500).json({ message: "Failed to unlock badge." });
  }
};

// ✅ Set selected display badge
const setSelectedBadge = async (req, res) => {
  const userId = req.user.user_id;
  const { badge_id } = req.body;

  try {
    const check = await pool.query(
      `SELECT 1 FROM user_badges WHERE user_id = $1 AND badge_id = $2`,
      [userId, badge_id]
    );
    if (!check.rowCount) {
      return res.status(403).json({ message: "You don't own this badge." });
    }

    await pool.query(
      `UPDATE user_display_preferences
       SET selected_badge_id = $1
       WHERE user_id = $2`,
      [badge_id, userId]
    );

    res.status(200).json({ message: "Selected badge updated." });
  } catch (err) {
    console.error("❌ Set Badge Error:", err.message);
    res.status(500).json({ message: "Failed to set badge." });
  }
};

// ❌ OPTIONAL: Remove a badge from a user (admin-only)
const removeUserBadge = async (req, res) => {
  const { user_id, badge_id } = req.body;

  try {
    await pool.query(
      `DELETE FROM user_badges WHERE user_id = $1 AND badge_id = $2`,
      [user_id, badge_id]
    );

    res.status(200).json({ message: "Badge removed from user." });
  } catch (err) {
    console.error("❌ Remove Badge Error:", err.message);
    res.status(500).json({ message: "Failed to remove badge." });
  }
};

// ✅ Admin-only: Create new badge
const createBadge = async (req, res) => {
  const { badge_name, description, icon, is_exclusive = false } = req.body;

  if (!badge_name || !icon) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    await pool.query(
      `
      INSERT INTO badges (badge_name, description, icon, is_exclusive)
      VALUES ($1, $2, $3, $4)
    `,
      [badge_name, description, icon, is_exclusive]
    );

    res.status(201).json({ message: "Badge created successfully." });
  } catch (err) {
    console.error("❌ Create Badge Error:", err.message);
    res.status(500).json({ message: "Failed to create badge." });
  }
};

module.exports = {
  getAllBadges,
  getUserUnlockedBadges,
  unlockBadgeForUser,
  setSelectedBadge,
  removeUserBadge,
  createBadge,
};
