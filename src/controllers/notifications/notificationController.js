// File: src/controllers/notifications/notificationController.js
// Description: Handles creation, fetching, updating, and deletion of user notifications

const pool = require("../../config/db");
const { getIO, getSocketIdByUserId } = require("../../config/socket");
const NotificationTypes = require("../../models/notificationModel");
const {
  getDefaultNotificationContent,
} = require("../../utils/notificationHelpers");

// 🔔 Emit helper
const emitNotificationIfOnline = async (userId, notification) => {
  try {
    const socketId = await getSocketIdByUserId(userId);
    if (socketId) {
      getIO().to(socketId).emit("notification", notification);
      console.log("📨 Emitted notification to socket:", socketId);
    } else {
      console.log("🔕 User is offline — notification stored only in DB");
    }
  } catch (err) {
    console.error("❌ emitNotificationIfOnline error:", err.message);
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
      INSERT INTO notifications (user_id, type, content, is_read, created_at, link, data)
      VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP, $4, $5)
      RETURNING *
      `,
      [user_id, type, finalContent, link || null, JSON.stringify(data || {})]
    );

    const notification = result.rows[0];
    await emitNotificationIfOnline(user_id, notification);

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
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const offset = (page - 1) * limit;
    const filterType = req.query.filter || null;

    let query = `
      SELECT * FROM notifications
      WHERE user_id = $1
    `;
    let countQuery = `SELECT COUNT(*) FROM notifications WHERE user_id = $1`;
    const values = [userId];
    let countValues = [userId];

    if (filterType) {
      query += ` AND type = $2`;
      countQuery += ` AND type = $2`;
      values.push(filterType);
      countValues.push(filterType);
    }

    query += ` ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${
      values.length + 2
    }`;
    values.push(limit, offset);

    const dataRes = await pool.query(query, values);
    const countRes = await pool.query(countQuery, countValues);

    const notifications = dataRes.rows.map((row) => ({
      ...row,
      data:
        typeof row.data === "string" ? JSON.parse(row.data) : row.data ?? {},
    }));

    const totalCount = parseInt(countRes.rows[0].count, 10);

    return res.status(200).json({ notifications, totalCount });
  } catch (err) {
    console.error("❌ Error fetching notifications:", err);
    return res.status(500).json({ error: "Failed to fetch notifications" });
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

// 📝 Update notification status (e.g., accepted/declined)
// POST /api/notifications/:id/status
// Body: { status: "accepted" | "declined" }

const updateNotificationStatus = async (req, res) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  const { status } = req.body;

  if (!["accepted", "declined"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    const result = await pool.query(
      `SELECT data FROM notifications WHERE notification_id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Notification not found" });
    }

    const existingData =
      typeof result.rows[0].data === "string"
        ? JSON.parse(result.rows[0].data)
        : result.rows[0].data || {};

    const updatedData = { ...existingData, status };

    await pool.query(
      `UPDATE notifications SET data = $1 WHERE notification_id = $2 AND user_id = $3`,
      [JSON.stringify(updatedData), id, userId]
    );

    return res.status(200).json({ message: "Status updated" });
  } catch (err) {
    console.error("Error updating notification status:", err);
    return res.status(500).json({ error: "Failed to update notification" });
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

// ❌ Delete multiple notifications by array of IDs
const deleteMultipleNotifications = async (req, res) => {
  const userId = req.user.user_id;
  const { ids } = req.body; // expects: { ids: ["uuid1", "uuid2", ...] }

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: "No notification IDs provided" });
  }

  try {
    const query = `
      DELETE FROM notifications
      WHERE user_id = $1 AND notification_id = ANY($2::uuid[])
    `;

    await pool.query(query, [userId, ids]);

    res.status(204).send();
  } catch (err) {
    console.error("❌ Error deleting selected notifications:", err);
    res.status(500).json({ error: "Failed to delete notifications" });
  }
};

// ❌ Delete all notifications for the current user
const deleteAllNotifications = async (req, res) => {
  const userId = req.user.user_id;

  try {
    await pool.query(
      `DELETE FROM notifications WHERE user_id = $1`,
      [userId]
    );

    res.status(204).send();
  } catch (err) {
    console.error("❌ Error deleting all notifications:", err);
    res.status(500).json({ error: "Failed to delete notifications" });
  }
};


module.exports = {
  createNotification,
  getUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  deleteMultipleNotifications,
  updateNotificationStatus,
};

