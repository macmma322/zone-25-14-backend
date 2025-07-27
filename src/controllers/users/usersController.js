// zone-25-14-backend/src/controllers/users/usersController.js
// This file contains the user-related controller functions for handling profile data, social links, preferences, and more.
// It interacts with the database to retrieve and update user information.
// Import necessary modules and configurations
const pool = require("../../config/db");
const { getIO } = require("../../config/socket");

// ✅ GET Profile Overview
const getProfileOverview = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const encryptionKey = process.env.ENCRYPTION_SECRET;
    const userRes = await pool.query(
      `
      SELECT 
        u.points, 
        u.username,
        pgp_sym_decrypt(u.email, $2) AS email,
        u.profile_picture,
        u.created_at,
        rl.role_name,
        rl.discount_percentage,
        rl.required_points,
        rl.is_staff,
        u.biography,
        u.display_name,
        u.banner_image
      FROM users u
      JOIN user_roles_levels rl ON u.role_level_id = rl.role_level_id
      WHERE u.user_id = $1
    `,
      [userId, encryptionKey]
    );
    const linkedRes = await pool.query(
      `SELECT provider, profile_url, avatar_url FROM user_linked_accounts WHERE user_id = $1`,
      [userId]
    );

    const user = userRes.rows[0];

    let nextRank = "MAXED OUT";
    if (!user.is_staff) {
      const nextRes = await pool.query(
        `
        SELECT role_name, required_points
        FROM user_roles_levels
        WHERE required_points > $1
        ORDER BY required_points ASC
        LIMIT 1
      `,
        [user.points]
      );

      if (nextRes.rows.length) {
        nextRank = {
          name: nextRes.rows[0].role_name,
          required_points: nextRes.rows[0].required_points,
          points_needed: nextRes.rows[0].required_points - user.points,
        };
      }
    } else {
      nextRank = "Staff — Max Tier";
    }

    const subs = await pool.query(
      `
      SELECT niche_code, tier_type, end_date
      FROM user_subscriptions
      WHERE user_id = $1 AND is_active = true AND end_date > CURRENT_TIMESTAMP
    `,
      [userId]
    );

    const cartCount = await pool.query(
      `SELECT COUNT(*) FROM shopping_cart WHERE user_id = $1`,
      [userId]
    );
    const wishlistCount = await pool.query(
      `SELECT COUNT(*) FROM wishlist WHERE user_id = $1`,
      [userId]
    );

    res.status(200).json({
      username: user.username,
      email: user.email,
      avatar: user.profile_picture,
      points: user.points,
      role: user.role_name,
      created_at: user.created_at,
      discount: `${user.discount_percentage}%`,
      next_rank: nextRank,
      subscriptions: subs.rows,
      cart_items: parseInt(cartCount.rows[0].count),
      wishlist_items: parseInt(wishlistCount.rows[0].count),
      linkedAccounts: linkedRes.rows,
    });
  } catch (err) {
    console.error("Profile Hub Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Public Profile Route
const getPublicProfile = async (req, res) => {
  const { username } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        u.user_id,
        u.username,
        u.display_name,
        u.biography,
        u.profile_picture,
        u.banner_image,
        rl.role_name
      FROM users u
      LEFT JOIN user_roles_levels rl ON u.role_level_id = rl.role_level_id
      WHERE u.username = $1
      `,
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Public profile error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ GET user social links
const getUserSocialLinks = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(
      `
      SELECT instagram, youtube, twitch, twitter, website
      FROM user_socials
      WHERE user_id = $1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({
        instagram: null,
        youtube: null,
        twitch: null,
        twitter: null,
        website: null,
      });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Get Social Links Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ UPDATE user social links
const updateUserSocialLinks = async (req, res) => {
  const userId = req.user.user_id;
  const { instagram, youtube, twitch, twitter, website } = req.body;

  try {
    await pool.query(
      `
      INSERT INTO user_socials (user_id, instagram, youtube, twitch, twitter, website)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id) DO UPDATE
      SET instagram = EXCLUDED.instagram,
          youtube = EXCLUDED.youtube,
          twitch = EXCLUDED.twitch,
          twitter = EXCLUDED.twitter,
          website = EXCLUDED.website
      `,
      [userId, instagram, youtube, twitch, twitter, website]
    );

    res.status(200).json({ message: "Social links updated successfully." });
  } catch (err) {
    console.error("Update Social Links Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ PATCH: Update username only
const updateProfile = async (req, res) => {
  const userId = req.user.user_id;
  const { username } = req.body;

  try {
    await pool.query(`UPDATE users SET username = $1 WHERE user_id = $2`, [
      username,
      userId,
    ]);

    res.status(200).json({ message: "Username updated successfully." });
  } catch (err) {
    console.error("Profile Update Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ PATCH: Upload avatar image (used with multer)
const uploadAvatar = async (req, res) => {
  const userId = req.user.user_id;

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  const imagePath = `/uploads/avatars/${userId}/${req.file.filename}`;

  try {
    // Update user profile with the new avatar URL
    await pool.query(
      `UPDATE users SET profile_picture = $1 WHERE user_id = $2`,
      [imagePath, userId]
    );

    // Emit a socket event to notify other parts of the app
    const io = getIO(); // Get the socket instance
    io.emit("userAvatarUpdated", { userId, newAvatarUrl: imagePath });

    // Send the response with the updated avatar
    res.status(200).json({
      message: "Avatar uploaded successfully.",
      avatar: imagePath,
    });
  } catch (err) {
    console.error("Upload Avatar Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ PATCH: Set birthday (only once)
const setBirthday = async (req, res) => {
  const userId = req.user.user_id;
  const { birthday } = req.body;

  try {
    const result = await pool.query(
      `SELECT birthday FROM users WHERE user_id = $1`,
      [userId]
    );
    if (result.rows[0]?.birthday) {
      return res.status(400).json({ message: "Birthday is already set." });
    }

    await pool.query(`UPDATE users SET birthday = $1 WHERE user_id = $2`, [
      birthday,
      userId,
    ]);

    res.status(200).json({ message: "Birthday saved successfully." });
  } catch (err) {
    console.error("Birthday Set Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ GET user preferences
const getUserPreferences = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(
      `
      SELECT theme_mode, language, preferred_currency, email_notifications
      FROM user_preferences
      WHERE user_id = $1
    `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Preferences not found." });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error("Get Preferences Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ PATCH: Update user preferences
const updateUserPreferences = async (req, res) => {
  const userId = req.user.user_id;
  const { theme_mode, language, preferred_currency, email_notifications } =
    req.body;

  try {
    await pool.query(
      `
      UPDATE user_preferences
      SET theme_mode = $1,
          language = $2,
          preferred_currency = $3,
          email_notifications = $4
      WHERE user_id = $5
    `,
      [theme_mode, language, preferred_currency, email_notifications, userId]
    );

    res.status(200).json({ message: "Preferences updated successfully." });
  } catch (err) {
    console.error("Update Preferences Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ GET user display preferences
const getDisplayPreferences = async (req, res) => {
  const userId = req.user.user_id;
  try {
    const result = await pool.query(
      `SELECT selected_title_id, selected_badge_id FROM user_display_preferences WHERE user_id = $1`,
      [userId]
    );
    res.status(200).json(result.rows[0] || {});
  } catch (err) {
    console.error("Display Preferences Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ UPDATE user display preferences
const updateDisplayPreferences = async (req, res) => {
  const userId = req.user.user_id;
  const { selected_title_id, selected_badge_id } = req.body;
  try {
    await pool.query(
      `INSERT INTO user_display_preferences (user_id, selected_title_id, selected_badge_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE
       SET selected_title_id = $2, selected_badge_id = $3`,
      [userId, selected_title_id, selected_badge_id]
    );
    res.status(200).json({ message: "Display preferences updated." });
  } catch (err) {
    console.error("Update Display Preferences Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  getProfileOverview,
  getPublicProfile,
  getUserSocialLinks,
  updateUserSocialLinks,
  updateProfile,
  uploadAvatar,
  setBirthday,
  getUserPreferences,
  updateUserPreferences,
  getDisplayPreferences,
  updateDisplayPreferences,
};
