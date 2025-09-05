// src/services/notificationService.js
const pool = require("../config/db");
const { getIO } = require("../config/socket");
const NotificationTypes = require("../models/notificationModel");
const {
  getDefaultNotificationContent,
} = require("../utils/notificationHelpers");

const sendNotification = async (
  userId,
  type,
  content = null,
  link = null,
  data = {},
  additionalInfo = null
) => {
  try {
    if (!userId) throw new Error("❌ Missing target userId.");
    if (!type || typeof type !== "string")
      throw new Error("❌ Notification type is undefined.");
    if (!Object.values(NotificationTypes).includes(type)) {
      throw new Error(`❌ Invalid notification type: ${type}`);
    }

    const finalContent =
      content || getDefaultNotificationContent(type, data || {});

    const {
      rows: [notification],
    } = await pool.query(
      `INSERT INTO notifications (user_id, type, content, is_read, created_at, link, data, additional_info)
       VALUES ($1,$2,$3, FALSE, CURRENT_TIMESTAMP, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        type,
        finalContent,
        link || null,
        JSON.stringify(data || {}),
        additionalInfo || null,
      ]
    );

    // ensure data is an object for the client
    notification.data = data;

    const io = getIO();
    io.to(`user:${userId}`).emit("notification", notification); // ← room emit

    return notification;
  } catch (err) {
    console.error("❌ Failed to send notification:", err);
    throw err;
  }
};

async function updateNotificationStatusByRequestId(requestId, status) {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET data = jsonb_set(data, '{status}', $2::jsonb, true)
       WHERE data->>'requestId' = $1`,
      [requestId, JSON.stringify(status)]
    );

    if (result.rowCount === 0) {
      throw new Error(`❌ No notification found with requestId: ${requestId}`);
    }
    return true;
  } catch (err) {
    console.error("❌ Error updating notification status:", err);
    throw err;
  }
}

module.exports = { sendNotification, updateNotificationStatusByRequestId };
