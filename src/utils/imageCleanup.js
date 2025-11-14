// src/utils/imageCleanup.js
const path = require("path");
const fsPromises = require("fs/promises");

/**
 * Extract file path from URL
 * Example: "http://localhost:3000/uploads/event_banners/banner-123.webp"
 * Returns: "uploads/event_banners/banner-123.webp"
 */
function extractFilePath(url) {
  if (!url) return null;

  // Remove domain if present
  const urlWithoutDomain = url.replace(/^https?:\/\/[^\/]+/, "");

  // Remove leading slash
  const relativePath = urlWithoutDomain.replace(/^\//, "");

  // Only return path if it's in uploads folder
  if (relativePath.startsWith("uploads/")) {
    return relativePath;
  }

  return null;
}

/**
 * Delete image file if it exists
 */
async function deleteImage(imageUrl) {
  try {
    const filePath = extractFilePath(imageUrl);
    if (!filePath) {
      console.log("⚠️ No valid file path to delete:", imageUrl);
      return;
    }

    const fullPath = path.join(process.cwd(), filePath);
    await fsPromises.unlink(fullPath);
    console.log("🗑️ Deleted image:", filePath);
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log("⚠️ File not found (already deleted):", imageUrl);
    } else {
      console.error("❌ Error deleting image:", err);
    }
  }
}

/**
 * Delete both banner and thumbnail
 */
async function deleteEventImages(bannerUrl, thumbnailUrl) {
  const deletions = [];

  if (bannerUrl) {
    deletions.push(deleteImage(bannerUrl));
  }

  if (thumbnailUrl) {
    deletions.push(deleteImage(thumbnailUrl));
  }

  await Promise.all(deletions);
  console.log("✅ Event images cleanup completed");
}

module.exports = {
  extractFilePath,
  deleteImage,
  deleteEventImages,
};
