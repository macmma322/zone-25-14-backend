// src/scripts/cleanOrphanedAvatars.js
const pool = require("../config/db");
const fsPromises = require("fs/promises");
const path = require("path");

async function cleanOrphanedAvatars() {
  console.log("👤 Cleaning orphaned avatars...");

  try {
    // Get all avatar URLs from database
    const { rows } = await pool.query(
      "SELECT avatar FROM users WHERE avatar IS NOT NULL"
    );

    const activeAvatars = new Set(rows.map((r) => r.avatar.split("/").pop()));

    // Check avatar directory
    const avatarDir = path.join(process.cwd(), "uploads", "avatars");
    const files = await fsPromises.readdir(avatarDir);

    let deleted = 0;
    for (const file of files) {
      if (!activeAvatars.has(file)) {
        await fsPromises.unlink(path.join(avatarDir, file));
        deleted++;
      }
    }

    console.log(`✅ Deleted ${deleted} orphaned avatars`);
  } catch (err) {
    console.error("❌ Avatar cleanup failed:", err);
  }
}

module.exports = cleanOrphanedAvatars;
