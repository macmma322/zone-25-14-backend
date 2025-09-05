const pool = require("../../config/db");

// shared defaults
const PRIVACY_DEFAULTS = {
  allow_friend_requests: true,
  allow_messages: true,
  profile_visibility: "public",
  show_wishlist: true,
  show_recent_purchases: true,
  appear_offline: false,
};

const getPrivacySettings = async (req, res) => {
  const userId = req.user.user_id || req.user.userId; // normalize
  try {
    const { rows } = await pool.query(
      `SELECT allow_friend_requests, allow_messages, profile_visibility,
              show_wishlist, show_recent_purchases, appear_offline
         FROM privacy_settings
        WHERE user_id = $1`,
      [userId]
    );

    if (!rows.length) {
      // auto-provision row with defaults
      await pool.query(
        `INSERT INTO privacy_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [userId]
      );
      return res.status(200).json(PRIVACY_DEFAULTS);
    }

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error("Get Privacy Settings Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const updatePrivacySettings = async (req, res) => {
  const userId = req.user.user_id || req.user.userId;

  // whitelist + minimal validation
  const allowed = [
    "allow_friend_requests",
    "allow_messages",
    "profile_visibility",
    "show_wishlist",
    "show_recent_purchases",
    "appear_offline",
  ];
  const patch = Object.fromEntries(
    Object.entries(req.body || {}).filter(([k]) => allowed.includes(k))
  );

  // clamp enums (avoid invalid values)
  if (
    patch.profile_visibility &&
    !["public", "private", "friends-only"].includes(patch.profile_visibility)
  ) {
    return res.status(400).json({ message: "Invalid profile_visibility" });
  }

  try {
    if (Object.keys(patch).length === 0) {
      // ensure row exists anyway
      await pool.query(
        `INSERT INTO privacy_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING`,
        [userId]
      );
      return res.status(200).json({ message: "No changes" });
    }

    // build UPSERT dynamically
    const keys = Object.keys(patch);
    const cols = keys.join(", ");
    const vals = keys.map((_, i) => `$${i + 2}`).join(", ");
    const setClause = keys.map((k, i) => `${k} = EXCLUDED.${k}`).join(", ");

    await pool.query(
      `
      INSERT INTO privacy_settings (user_id, ${cols})
      VALUES ($1, ${vals})
      ON CONFLICT (user_id) DO UPDATE SET ${setClause}
      `,
      [userId, ...keys.map((k) => patch[k])]
    );

    return res.status(200).json({ message: "Privacy settings updated." });
  } catch (err) {
    console.error("Update Privacy Settings Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { getPrivacySettings, updatePrivacySettings };
