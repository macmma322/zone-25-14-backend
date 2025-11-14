// src/scripts/optimizeDatabase.js
const pool = require("../config/db");

async function optimizeDatabase() {
  console.log("🗄️ Optimizing database...");

  try {
    // Vacuum to reclaim storage
    await pool.query("VACUUM ANALYZE");

    // Get database size
    const { rows } = await pool.query(
      "SELECT pg_size_pretty(pg_database_size(current_database())) as size"
    );

    console.log(`✅ Database optimized. Size: ${rows[0].size}`);
  } catch (err) {
    console.error("❌ Database optimization failed:", err);
  }
}

module.exports = optimizeDatabase;
