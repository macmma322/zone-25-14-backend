// src/scripts/cleanExpiredSessions.js
const redis = require("../config/redis");
const pool = require("../config/db");

async function cleanExpiredSessions() {
  console.log("🧹 Cleaning expired sessions...");

  try {
    // Clean Redis sessions older than 30 days
    const keys = await redis.keys("session:*");
    let cleaned = 0;

    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl === -1) {
        // No expiration set
        await redis.del(key);
        cleaned++;
      }
    }

    // Clean DB auth tokens older than 30 days
    const result = await pool.query(
      "DELETE FROM auth_tokens WHERE created_at < NOW() - INTERVAL '30 days'"
    );

    console.log(
      `✅ Cleaned ${cleaned} Redis keys, ${result.rowCount} DB tokens`
    );
  } catch (err) {
    console.error("❌ Session cleanup failed:", err);
  }
}

module.exports = cleanExpiredSessions;
