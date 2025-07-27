// zone-25-14-backend/src/controllers/users/titlesController.js
// This file contains the controller functions for managing user titles.
// It handles fetching all titles, user-specific titles, unlocking titles, and setting display titles.
// It interacts with the database to perform these operations.

const pool = require("../../config/db");
const { logActivity } = require("../../services/activityService"); // ✅ Import logger

// ✅ Get all available titles
const getAllTitles = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT title_id, title_name, description, icon, is_exclusive
      FROM titles
      ORDER BY created_at DESC
    `);
    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Get All Titles Error:", err.message);
    res.status(500).json({ message: "Failed to fetch titles." });
  }
};

// ✅ Get unlocked titles for current user
const getUserUnlockedTitles = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(
      `
      SELECT t.title_id, t.title_name, t.description, t.icon, ut.unlocked_at
      FROM user_titles ut
      JOIN titles t ON t.title_id = ut.title_id
      WHERE ut.user_id = $1
      ORDER BY ut.unlocked_at DESC
    `,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Get User Titles Error:", err.message);
    res.status(500).json({ message: "Failed to fetch user titles." });
  }
};

// ✅ Unlock a title for a user (admin or achievement-based)
const unlockTitleForUser = async (req, res) => {
  const { user_id, title_id } = req.body;

  try {
    const inserted = await pool.query(
      `
      INSERT INTO user_titles (user_id, title_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      RETURNING *
    `,
      [user_id, title_id]
    );

    if (inserted.rowCount > 0) {
      const titleInfo = await pool.query(
        `SELECT title_name FROM titles WHERE title_id = $1`,
        [title_id]
      );

      const titleName = titleInfo.rows[0]?.title_name || "a title";

      // ✅ Log activity
      await logActivity(user_id, "title_unlocked", `Unlocked '${titleName}'`, {
        title_id,
      });
    }

    res.status(200).json({ message: "Title unlocked successfully." });
  } catch (err) {
    console.error("❌ Unlock Title Error:", err.message);
    res.status(500).json({ message: "Failed to unlock title." });
  }
};

// ✅ Set selected display title (used in user_display_preferences)
const setSelectedTitle = async (req, res) => {
  const userId = req.user.user_id;
  const { title_id } = req.body;

  try {
    // Verify user owns this title
    const check = await pool.query(
      `SELECT 1 FROM user_titles WHERE user_id = $1 AND title_id = $2`,
      [userId, title_id]
    );
    if (!check.rowCount) {
      return res.status(403).json({ message: "You don't own this title." });
    }

    await pool.query(
      `UPDATE user_display_preferences
       SET selected_title_id = $1
       WHERE user_id = $2`,
      [title_id, userId]
    );

    res.status(200).json({ message: "Selected title updated." });
  } catch (err) {
    console.error("❌ Set Title Error:", err.message);
    res.status(500).json({ message: "Failed to set display title." });
  }
};

// ❌ OPTIONAL: Remove a title from a user (admin-only action)
const removeUserTitle = async (req, res) => {
  const { user_id, title_id } = req.body;

  try {
    await pool.query(
      `
      DELETE FROM user_titles
      WHERE user_id = $1 AND title_id = $2
    `,
      [user_id, title_id]
    );

    res.status(200).json({ message: "Title removed from user." });
  } catch (err) {
    console.error("❌ Remove Title Error:", err.message);
    res.status(500).json({ message: "Failed to remove title." });
  }
};

// ✅ Admin-only: Create new title
const createTitle = async (req, res) => {
  const { title_name, description, icon, is_exclusive = false } = req.body;

  if (!title_name || !icon) {
    return res.status(400).json({ message: "Missing required fields." });
  }

  try {
    await pool.query(
      `
      INSERT INTO titles (title_name, description, icon, is_exclusive)
      VALUES ($1, $2, $3, $4)
    `,
      [title_name, description, icon, is_exclusive]
    );

    res.status(201).json({ message: "Title created successfully." });
  } catch (err) {
    console.error("❌ Create Title Error:", err.message);
    res.status(500).json({ message: "Failed to create title." });
  }
};

module.exports = {
  getAllTitles,
  getUserUnlockedTitles,
  unlockTitleForUser,
  setSelectedTitle,
  removeUserTitle,
  createTitle,
};
