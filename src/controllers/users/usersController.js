const pool = require("../../config/db");

// ✅ GET Profile Overview
exports.getProfileOverview = async (req, res) => {
  const userId = req.user.userId;

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
        u.created_at, 
        u.biography
      FROM users u
      JOIN user_roles_levels rl ON u.role_level_id = rl.role_level_id
      WHERE u.user_id = $1
    `,
      [userId, encryptionKey]
    );

    const user = userRes.rows[0];

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

    let nextRank;

    if (user.is_staff) {
      nextRank = "Staff — Max Tier";
    } else {
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

      nextRank = nextRes.rows[0]
        ? {
            name: nextRes.rows[0].role_name,
            required_points: nextRes.rows[0].required_points,
            points_needed: nextRes.rows[0].required_points - user.points,
          }
        : "MAXED OUT";
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
      email: user.email, // ✅ add this!
      avatar: user.profile_picture,
      points: user.points,
      role: user.role_name,
      created_at: user.created_at, // ✅ here too
      discount: `${user.discount_percentage}%`,
      next_rank: nextRank || "MAXED OUT",
      subscriptions: subs.rows,
      cart_items: parseInt(cartCount.rows[0].count),
      wishlist_items: parseInt(wishlistCount.rows[0].count),
    });
  } catch (err) {
    console.error("Profile Hub Error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Public Profile Route
exports.getPublicProfile = async (req, res) => {
  const { username } = req.params;

  try {
    const result = await pool.query(
      `
      SELECT 
        u.username,
        u.biography,
        u.profile_picture,
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

// ✅ PATCH: Update username only
exports.updateProfile = async (req, res) => {
  const userId = req.user.userId;
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
exports.uploadAvatar = async (req, res) => {
  const userId = req.user.userId;

  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded." });
  }

  const imagePath = `/uploads/avatars/${req.file.filename}`;

  try {
    await pool.query(
      `UPDATE users SET profile_picture = $1 WHERE user_id = $2`,
      [imagePath, userId]
    );

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
exports.setBirthday = async (req, res) => {
  const userId = req.user.userId;
  const { birthday } = req.body;

  try {
    const result = await pool.query(
      `SELECT birthday FROM users WHERE user_id = $1`,
      [userId]
    );
    if (result.rows[0].birthday) {
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
exports.getUserPreferences = async (req, res) => {
  const userId = req.user.userId;

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
exports.updateUserPreferences = async (req, res) => {
  const userId = req.user.userId;
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
