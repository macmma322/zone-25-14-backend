// src/scripts/cleanupOrphanedImages.js
const pool = require("../config/db");
const fsPromises = require("fs/promises");
const path = require("path");

async function cleanupOrphanedImages() {
  try {
    console.log("🧹 Starting orphaned image cleanup...");

    // Get all banner and thumbnail URLs from database
    const { rows } = await pool.query(
      "SELECT banner_image, thumbnail_image FROM events WHERE banner_image IS NOT NULL OR thumbnail_image IS NOT NULL"
    );

    const activeImages = new Set();
    rows.forEach((row) => {
      if (row.banner_image) {
        const fileName = row.banner_image.split("/").pop();
        activeImages.add(fileName);
      }
      if (row.thumbnail_image) {
        const fileName = row.thumbnail_image.split("/").pop();
        activeImages.add(fileName);
      }
    });

    console.log(`📊 Found ${activeImages.size} active images in database`);

    // Check banner directory
    const bannerDir = path.join(process.cwd(), "uploads", "event_banners");
    const bannerFiles = await fsPromises.readdir(bannerDir);

    let deletedBanners = 0;
    for (const file of bannerFiles) {
      if (!activeImages.has(file)) {
        await fsPromises.unlink(path.join(bannerDir, file));
        console.log(`🗑️ Deleted orphaned banner: ${file}`);
        deletedBanners++;
      }
    }

    // Check thumbnail directory
    const thumbnailDir = path.join(
      process.cwd(),
      "uploads",
      "event_thumbnails"
    );
    const thumbnailFiles = await fsPromises.readdir(thumbnailDir);

    let deletedThumbnails = 0;
    for (const file of thumbnailFiles) {
      if (!activeImages.has(file)) {
        await fsPromises.unlink(path.join(thumbnailDir, file));
        console.log(`🗑️ Deleted orphaned thumbnail: ${file}`);
        deletedThumbnails++;
      }
    }

    console.log(
      `✅ Cleanup complete: ${deletedBanners} banners, ${deletedThumbnails} thumbnails deleted`
    );
  } catch (err) {
    console.error("❌ Cleanup failed:", err);
  }
}

// Run if called directly
if (require.main === module) {
  cleanupOrphanedImages()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = cleanupOrphanedImages;
