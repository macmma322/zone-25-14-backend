// src/scripts/updateEventStatuses.js
const pool = require("../config/db");

async function updateEventStatuses() {
  console.log("📅 Updating event statuses...");

  try {
    // Set events to "ended" if end time has passed
    const ended = await pool.query(
      `UPDATE events 
       SET status = 'ended', updated_at = NOW()
       WHERE status IN ('upcoming', 'live') 
       AND ends_at < NOW()
       RETURNING event_id, title`
    );

    // Set events to "live" if start time has passed but not ended
    const live = await pool.query(
      `UPDATE events 
       SET status = 'live', updated_at = NOW()
       WHERE status = 'upcoming' 
       AND starts_at <= NOW() 
       AND (ends_at IS NULL OR ends_at > NOW())
       RETURNING event_id, title`
    );

    console.log(`✅ Updated: ${ended.rowCount} ended, ${live.rowCount} live`);
  } catch (err) {
    console.error("❌ Event status update failed:", err);
  }
}

module.exports = updateEventStatuses;
