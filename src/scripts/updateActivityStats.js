// src/scripts/updateActivityStats.js
const pool = require("../config/db");

async function updateActivityStats() {
  console.log("📊 Updating user activity stats...");

  try {
    // Update last_active for users active in last 5 minutes
    await pool.query(
      `UPDATE users 
       SET last_active = NOW() 
       WHERE user_id IN (
         SELECT DISTINCT user_id FROM user_activity 
         WHERE created_at > NOW() - INTERVAL '5 minutes'
       )`
    );

    // Calculate weekly active users
    const { rows } = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as count 
       FROM user_activity 
       WHERE created_at > NOW() - INTERVAL '7 days'`
    );

    console.log(`✅ Weekly active users: ${rows[0].count}`);
  } catch (err) {
    console.error("❌ Activity stats update failed:", err);
  }
}

module.exports = updateActivityStats;
