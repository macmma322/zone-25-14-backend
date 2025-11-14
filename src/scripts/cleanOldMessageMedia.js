// src/scripts/cleanOldMessageMedia.js
const pool = require("../config/db");
const fsPromises = require("fs/promises");
const path = require("path");

async function cleanOldMessageMedia() {
  console.log("💬 Cleaning old message media...");

  try {
    // Get media from deleted messages (older than 30 days)
    const { rows } = await pool.query(
      `SELECT media_url FROM messages 
       WHERE media_url IS NOT NULL 
       AND deleted_at IS NOT NULL 
       AND deleted_at < NOW() - INTERVAL '30 days'`
    );

    let deleted = 0;
    for (const row of rows) {
      try {
        const filePath = row.media_url.replace(/^.*\/uploads/, "uploads");
        await fsPromises.unlink(filePath);
        deleted++;
      } catch {}
    }

    // Permanently delete soft-deleted messages
    await pool.query(
      `DELETE FROM messages 
       WHERE deleted_at < NOW() - INTERVAL '30 days'`
    );

    console.log(`✅ Deleted ${deleted} media files`);
  } catch (err) {
    console.error("❌ Message media cleanup failed:", err);
  }
}

module.exports = cleanOldMessageMedia;
