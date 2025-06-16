// File: src/controllers/notifications/notificationController.js
// Description: Handles creation, fetching, updating, and deletion of user notifications

const pool = require("../../config/db");
const { getIO, getSocketIdByUserId } = require("../../config/socket");
const NotificationTypes = require("../../models/notificationModel");
const {
  getDefaultNotificationContent,
} = require("../../utils/notificationHelpers");

// 🔔 Emit helper
const emitNotificationIfOnline = (userId, notification) => {
  const socketId = getSocketIdByUserId(userId);
  if (socketId) {
    getIO().to(socketId).emit("notification", notification);
    console.log("📨 Emitted notification to socket:", socketId);
  }
};

// 🔔 Create and emit a new notification
const createNotification = async (req, res) => {
  try {
    const { user_id, type, content, link, data } = req.body;

    // Validate notification type
    if (!Object.values(NotificationTypes).includes(type)) {
      return res
        .status(400)
        .json({ error: `Invalid notification type: ${type}` });
    }

    // Fallback content if none provided
    const finalContent =
      content || getDefaultNotificationContent(type, data || {});

    const result = await pool.query(
      `
      INSERT INTO notifications (user_id, type, content, is_read, created_at, link)
      VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP, $4)
      RETURNING *
      `,
      [user_id, type, finalContent, link || null]
    );

    const notification = result.rows[0];
    emitNotificationIfOnline(user_id, notification);

    res.status(201).json(notification);
  } catch (err) {
    console.error("❌ Error creating notification:", err);
    res.status(500).json({ error: "Failed to create notification" });
  }
};

// 📥 Fetch notifications for logged-in user (paginated)
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const page = parseInt(req.query.page || "1");
    const limit = parseInt(req.query.limit || "10");
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching notifications:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// ✅ Mark one notification as read
const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE notification_id = $1 AND user_id = $2`,
      [id, userId]
    );

    res.sendStatus(204);
  } catch (err) {
    console.error("❌ Error marking notification as read:", err);
    res.status(500).json({ error: "Failed to update notification" });
  }
};

// ✅ Mark all as read
const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.user_id;

    await pool.query(
      `UPDATE notifications
       SET is_read = true
       WHERE user_id = $1`,
      [userId]
    );

    res.sendStatus(204);
  } catch (err) {
    console.error("❌ Error marking all notifications as read:", err);
    res.status(500).json({ error: "Failed to update notifications" });
  }
};

// 🗑️ Delete a specific notification
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    await pool.query(
      `DELETE FROM notifications
       WHERE notification_id = $1 AND user_id = $2`,
      [id, userId]
    );

    res.sendStatus(204);
  } catch (err) {
    console.error("❌ Error deleting notification:", err);
    res.status(500).json({ error: "Failed to delete notification" });
  }
};

module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
};
