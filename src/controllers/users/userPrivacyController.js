// zone-25-14-backend/src/controllers/users/userPrivacyController.js
// This file contains the controller functions for managing user privacy settings.
// It handles retrieving and updating privacy settings for users.
const pool = require("../../config/db");

// ✅ GET user privacy settings
const getPrivacySettings = async (req, res) => {
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `
      SELECT allow_friend_requests, allow_messages, profile_visibility,
             show_wishlist, show_recent_purchases, appear_offline
      FROM privacy_settings
      WHERE user_id = $1
    `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Privacy settings not found." });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Get Privacy Settings Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ UPDATE user privacy settings
const updatePrivacySettings = async (req, res) => {
  const userId = req.user.userId;
  const {
    allow_friend_requests,
    allow_messages,
    profile_visibility,
    show_wishlist,
    show_recent_purchases,
    appear_offline,
  } = req.body;

  try {
    await pool.query(
      `
      UPDATE privacy_settings
      SET allow_friend_requests = $1,
          allow_messages = $2,
          profile_visibility = $3,
          show_wishlist = $4,
          show_recent_purchases = $5,
          appear_offline = $6
      WHERE user_id = $7
    `,
      [
        allow_friend_requests,
        allow_messages,
        profile_visibility,
        show_wishlist,
        show_recent_purchases,
        appear_offline,
        userId,
      ]
    );

    res.status(200).json({ message: "Privacy settings updated." });
  } catch (err) {
    console.error("Update Privacy Settings Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getPrivacySettings,
  updatePrivacySettings,
};
