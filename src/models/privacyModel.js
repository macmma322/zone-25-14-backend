const pool = require("../config/db");

const DEFAULTS = {
  allow_friend_requests: true,
  allow_messages: true,
  profile_visibility: "public",
  show_wishlist: true,
  show_recent_purchases: true,
  appear_offline: false,
  show_friends_list: "mutual",
};

async function getPrivacyOrDefaults(userId) {
  const { rows } = await pool.query(
    `SELECT allow_friend_requests, allow_messages, profile_visibility,
            show_wishlist, show_recent_purchases, appear_offline, show_friends_list
       FROM privacy_settings WHERE user_id = $1`,
    [userId]
  );
  return rows[0] ?? DEFAULTS;
}

module.exports = { getPrivacyOrDefaults, DEFAULTS };
