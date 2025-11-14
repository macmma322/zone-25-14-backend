// src/config/startupScripts.js
// Startup and maintenance scripts for the server
// Includes tasks like cleaning up orphaned images, scheduling backups, etc.
// ==================== IMPORTS ====================

const cron = require("node-cron");
const cleanupOrphanedImages = require("../scripts/cleanupOrphanedImages");
const cleanOrphanedAvatars = require("../scripts/cleanOrphanedAvatars");
const cleanExpiredSessions = require("../scripts/cleanExpiredSessions");
const updateEventStatuses = require("../scripts/updateEventStatuses");
const cleanOldNotifications = require("../scripts/cleanOldNotifications");
const cleanOldMessageMedia = require("../scripts/cleanOldMessageMedia");
const updateActivityStats = require("../scripts/updateActivityStats");
const optimizeDatabase = require("../scripts/optimizeDatabase");
const generateAnalytics = require("../scripts/generateAnalytics");

async function runStartupScripts() {
  console.log("🚀 Running startup scripts...");

  try {
    await cleanupOrphanedImages();
    await updateEventStatuses();
    console.log("✅ All startup scripts completed");
  } catch (err) {
    console.error("⚠️ Some startup scripts failed:", err);
  }
}

function scheduleMaintenanceTasks() {
  console.log("⏰ Scheduling maintenance tasks...");

  // Daily at 3 AM: Image cleanup
  cron.schedule("0 3 * * *", cleanupOrphanedImages);

  // Daily at 3:30 AM: Avatar cleanup
  cron.schedule("30 3 * * *", cleanOrphanedAvatars);

  // Daily at 4 AM: Old message media
  cron.schedule("0 4 * * *", cleanOldMessageMedia);

  // Every hour: Update event statuses
  cron.schedule("0 * * * *", updateEventStatuses);

  // Every 6 hours: Clean old notifications
  cron.schedule("0 */6 * * *", cleanOldNotifications);

  // Every 12 hours: Clean expired sessions
  cron.schedule("0 */12 * * *", cleanExpiredSessions);

  // Weekly Sunday 2 AM: Database optimization
  cron.schedule("0 2 * * 0", optimizeDatabase);

  // Daily at midnight: Generate analytics
  cron.schedule("0 0 * * *", generateAnalytics);

  console.log("✓ All maintenance tasks scheduled");
}

module.exports = {
  runStartupScripts,
  scheduleMaintenanceTasks,
};
