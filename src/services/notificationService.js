// File: src/services/notificationService.js
// Description: Sends real-time + stored notifications via PostgreSQL + Socket.IO with type validation

const pool = require("../config/db");
const { getIO, getSocketIdByUserId } = require("../config/socket");
const NotificationTypes = require("../models/notificationModel");

/**
 * Sends a notification to a user:
 * - Validates notification type
 * - Stores it in the database
 * - Emits real-time socket event if the user is online
 *
 * @param {string} userId - The recipient's user ID
 * @param {string} type - Notification type (must match NotificationTypes)
 * @param {string} content - Notification message content
 * @param {string|null} [link=null] - Optional redirect link
 */
const sendNotification = async (userId, type, content, link = null) => {
  try {
    // ✅ Validate type
    if (!Object.values(NotificationTypes).includes(type)) {
      throw new Error(`Invalid notification type: ${type}`);
    }

    // 🧾 Store in DB
    const result = await pool.query(
      `
        INSERT INTO notifications (user_id, type, content, is_read, created_at, link)
        VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP, $4)
        RETURNING *
      `,
      [userId, type, content, link]
    );

    const notification = result.rows[0];

    // 🚀 Real-time emit
    const socketId = getSocketIdByUserId(userId);
    if (socketId) {
      getIO().to(socketId).emit("notification", notification);
      console.log("📨 Emitted notification to socket:", socketId);
    } else {
      console.log("🕸️ User offline. Notification stored for later:", userId);
    }

    console.log("🔔 Notification created:", type, "→", content);
    return notification;
  } catch (err) {
    console.error("❌ sendNotification error:", err);
  }
};

module.exports = { sendNotification };
