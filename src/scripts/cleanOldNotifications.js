// src/scripts/cleanOldNotifications.js
const pool = require("../config/db");

async function cleanOldNotifications() {
  console.log("🔔 Cleaning old notifications...");

  try {
    // Delete read notifications older than 30 days
    const read = await pool.query(
      `DELETE FROM notifications 
       WHERE is_read = true 
       AND created_at < NOW() - INTERVAL '30 days'`
    );

    // Delete unread notifications older than 90 days
    const unread = await pool.query(
      `DELETE FROM notifications 
       WHERE is_read = false 
       AND created_at < NOW() - INTERVAL '90 days'`
    );

    console.log(
      `✅ Deleted ${read.rowCount} read, ${unread.rowCount} old unread`
    );
  } catch (err) {
    console.error("❌ Notification cleanup failed:", err);
  }
}

module.exports = cleanOldNotifications;
