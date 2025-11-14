// src/scripts/generateAnalytics.js
const pool = require("../config/db");

async function generateAnalytics() {
  console.log("📈 Generating analytics...");

  try {
    const stats = {};

    // Total users
    const users = await pool.query("SELECT COUNT(*) FROM users");
    stats.totalUsers = users.rows[0].count;

    // Active events
    const events = await pool.query(
      "SELECT COUNT(*) FROM events WHERE status IN ('upcoming', 'live')"
    );
    stats.activeEvents = events.rows[0].count;

    // Messages last 24h
    const messages = await pool.query(
      "SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '24 hours'"
    );
    stats.messages24h = messages.rows[0].count;

    console.log("✅ Analytics:", JSON.stringify(stats, null, 2));
  } catch (err) {
    console.error("❌ Analytics generation failed:", err);
  }
}

module.exports = generateAnalytics;
