const pool = require("../../config/db");

// 🔍 Check if user has any active subscription
const isUserSubscribed = async (userId) => {
  try {
    const query = `
      SELECT COUNT(*) FROM user_subscriptions
      WHERE user_id = $1
      AND is_active = true
      AND end_date > CURRENT_TIMESTAMP
    `;
    const result = await pool.query(query, [userId]);
    return parseInt(result.rows[0].count) > 0;
  } catch (err) {
    console.error("Subscription check failed:", err.message);
    return false;
  }
};

module.exports = {
  isUserSubscribed,
};
