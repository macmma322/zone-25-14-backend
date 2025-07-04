// File: src/services/notificationService.js
// Description: Safely sends notifications to users and emits real-time updates via Socket.IO

const pool = require("../config/db");
const { getIO, getSocketIdByUserId } = require("../config/socket");
const NotificationTypes = require("../models/notificationModel");
const {
  getDefaultNotificationContent,
} = require("../utils/notificationHelpers");

// 🔔 Reusable function to send a notification
const sendNotification = async (
  userId,
  type,
  content = null,
  link = null,
  data = {}
) => {
  try {
    // 🔍 Debug logs
    console.log("📨 sendNotification called with:", {
      userId,
      type,
      content,
      link,
      data,
    });

    // ❌ Validate inputs
    if (!userId) throw new Error("❌ Missing target userId.");
    if (!type || typeof type !== "string")
      throw new Error("❌ Notification type is undefined.");
    if (!Object.values(NotificationTypes).includes(type)) {
      throw new Error(`❌ Invalid notification type: ${type}`);
    }

    // 📝 Auto-generate content if not provided
    const finalContent =
      content || getDefaultNotificationContent(type, data || {});

    const result = await pool.query(
      `INSERT INTO notifications (user_id, type, content, is_read, created_at, link)
       VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP, $4)
       RETURNING *`,
      [userId, type, finalContent, link || null]
    );

    const notification = result.rows[0];

    // 📡 Emit via socket if user is online
    const socketId = await getSocketIdByUserId(userId);
    if (socketId) {
      const io = getIO();
      io.to(socketId).emit("notification", notification);
      console.log("🚀 Emitted notification to socket:", socketId);
    } else {
      console.log("📭 User offline, saved to DB only.");
    }

    return notification;
  } catch (err) {
    console.error("❌ Failed to send notification:", err);
    throw err; // Re-throw so caller can also catch
  }
};

module.exports = { sendNotification };
