// src/routes/events/eventCommentRoutes.js
// Description: Routes for managing event comments, including posting, fetching, and deleting comments with mention notifications

// src/routes/events/eventCommentRoutes.js
const express = require("express");
const router = express.Router();
const pool = require("../../config/db");
const { protectRoute } = require("../../middleware/authMiddleware");
const { sendNotification } = require("../../services/notificationService");

console.log("✅ eventCommentRoutes.js loaded"); // ✅ Add this

// Get comments for event
router.get("/:eventId/comments", async (req, res) => {
  console.log("📝 GET comments called for event:", req.params.eventId);

  try {
    const { eventId } = req.params;

    const query = `
      SELECT 
        c.*,
        u.username,
        u.profile_picture,
        u.display_name,
        (SELECT json_agg(json_build_object(
          'user_id', u2.user_id,
          'username', u2.username
        )) FROM users u2 WHERE u2.user_id = ANY(c.mentioned_users)) as mentioned_users_data
      FROM event_comments c
      JOIN users u ON c.user_id = u.user_id
      WHERE c.event_id = $1 AND c.deleted_at IS NULL
      ORDER BY c.created_at DESC
      LIMIT 100
    `;

    const { rows } = await pool.query(query, [eventId]);
    res.json({ success: true, comments: rows });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// Post comment
router.post("/:eventId/comments", protectRoute, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { content, mentioned_users } = req.body;
    const userId = req.user.userId;

    // Get event details
    const eventQuery = await pool.query(
      "SELECT title FROM events WHERE event_id = $1",
      [eventId]
    );
    const eventTitle = eventQuery.rows[0]?.title || "Unknown Event";

    // Get user details
    const userQuery = await pool.query(
      "SELECT username, display_name FROM users WHERE user_id = $1",
      [userId]
    );
    const senderName =
      userQuery.rows[0]?.display_name ||
      userQuery.rows[0]?.username ||
      "Someone";

    // Insert comment
    const commentQuery = `
      INSERT INTO event_comments (event_id, user_id, content, mentioned_users)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const { rows } = await pool.query(commentQuery, [
      eventId,
      userId,
      content,
      mentioned_users || [],
    ]);

    const comment = rows[0];

    // Send mention notifications
    if (mentioned_users && mentioned_users.length > 0) {
      const mentionInserts = mentioned_users.map(async (mentionedUserId) => {
        await pool.query(
          `INSERT INTO user_mentions (mentioned_user_id, mentioner_user_id, comment_id, event_id)
           VALUES ($1, $2, $3, $4)`,
          [mentionedUserId, userId, comment.comment_id, eventId]
        );

        await sendNotification(
          mentionedUserId,
          "mention",
          null,
          `/events/${eventId}`,
          {
            senderName,
            eventId,
            eventTitle,
            commentId: comment.comment_id,
            commentSnippet: content.substring(0, 100),
          }
        );
      });

      await Promise.all(mentionInserts);
    }

    // Return comment with user data
    const fullComment = await pool.query(
      `SELECT c.*, u.username, u.profile_picture, u.display_name
       FROM event_comments c
       JOIN users u ON c.user_id = u.user_id
       WHERE c.comment_id = $1`,
      [comment.comment_id]
    );

    res.json({ success: true, comment: fullComment.rows[0] });
  } catch (error) {
    console.error("Error posting comment:", error);
    res.status(500).json({ error: "Failed to post comment" });
  }
});

// Delete comment
router.delete(
  "/:eventId/comments/:commentId",
  protectRoute,
  async (req, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.user.userId;

      await pool.query(
        `UPDATE event_comments 
       SET deleted_at = NOW() 
       WHERE comment_id = $1 AND user_id = $2`,
        [commentId, userId]
      );

      res.json({ success: true, message: "Comment deleted" });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  }
);

module.exports = router;
