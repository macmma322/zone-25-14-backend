// Controller for handling message reactions
// File: src/controllers/messaging/reactionController.js
// Description: Contains functions to add reactions to messages and retrieve reactions by message or conversation

const db = require("../../config/db");
const { addReaction } = require("../../models/messageReactionModel");
const { getIO, getSocketIdByUserId } = require("../../config/socket");
const { sendNotification } = require("../../services/notificationService");
const {
  getDefaultNotificationContent,
} = require("../../utils/notificationHelpers");

const toggleReactionController = async (req, res) => {
  const { message_id, reaction } = req.body;
  const user_id = req.user.user_id;
  const username = req.user.username;

  try {
    const existing = await db.query(
      `SELECT * FROM message_reactions WHERE user_id = $1 AND message_id = $2 AND reaction = $3`,
      [user_id, message_id, reaction]
    );

    let type;
    let reactionData = null;

    if (existing.rows.length > 0) {
      // ❌ Already reacted — remove
      await db.query(`DELETE FROM message_reactions WHERE reaction_id = $1`, [
        existing.rows[0].reaction_id,
      ]);
      type = "remove";
    } else {
      // ✅ Not reacted — add
      const insertResult = await db.query(
        `INSERT INTO message_reactions (user_id, message_id, reaction)
         VALUES ($1, $2, $3)
         RETURNING reaction_id, user_id, message_id, reaction, reacted_at,
                   (SELECT username FROM users WHERE user_id = $1) AS username`,
        [user_id, message_id, reaction]
      );
      reactionData = insertResult.rows[0];
      type = "add";
    }

    const convoResult = await db.query(
      `SELECT conversation_id FROM messages WHERE message_id = $1`,
      [message_id]
    );
    const conversationId = convoResult.rows[0]?.conversation_id;

    // 📡 Real-time emit to room
    const io = getIO();
    if (conversationId && type) {
      io.to(conversationId).emit("reactionUpdated", {
        message_id,
        user_id,
        reaction,
        username,
        type,
      });
    }

    // 🔔 Smart Notification for non-room members
    if (type === "add" && conversationId) {
      const memberRes = await db.query(
        `SELECT user_id FROM conversation_members WHERE conversation_id = $1`,
        [conversationId]
      );

      const room = io.sockets.adapter.rooms.get(conversationId); // Set of socket IDs
      const socketsInRoom = room ? Array.from(room) : [];

      // 🧠 First get the message's real sender
      const messageRes = await db.query(
        `SELECT sender_id FROM messages WHERE message_id = $1`,
        [message_id]
      );
      const messageSenderId = messageRes.rows[0]?.sender_id;

      // 🔄 Notify only the original sender (not yourself) and only if they're not in the room
      if (messageSenderId && messageSenderId !== user_id) {
        const socketId = getSocketIdByUserId(messageSenderId);
        const isInRoom = socketsInRoom.includes(socketId);

        if (!isInRoom) {
          await sendNotification(
            messageSenderId,
            "reaction",
            getDefaultNotificationContent("reaction", { senderName: username }),
            `/chat/${conversationId}`
          );
        }
      }
    }

    // ✅ Respond
    if (type === "remove") {
      res.status(200).json({ removed: true, emoji: reaction });
    } else if (type === "add" && reactionData) {
      res.status(200).json({ reaction: reactionData });
    } else {
      res.status(200).json({ success: true });
    }
  } catch (err) {
    console.error("❌ Reaction DB error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/reactions?messageId=abc
const getReactionsByMessage = async (req, res) => {
  const { messageId } = req.query;
  if (!messageId) {
    return res.status(400).json({ error: "Missing messageId" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM message_reactions WHERE message_id = $1 ORDER BY reacted_at ASC",
      [messageId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching reactions:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /api/reactions/byConversation?conversationId=xyz
const getReactionsByConversation = async (req, res) => {
  const { conversationId } = req.query;
  if (!conversationId) {
    return res.status(400).json({ error: "Missing conversationId" });
  }

  try {
    const result = await pool.query(
      `SELECT r.*
       FROM message_reactions r
       JOIN messages m ON r.message_id = m.message_id
       WHERE m.conversation_id = $1
       ORDER BY r.reacted_at ASC`,
      [conversationId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching conversation reactions:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
// PATCH /api/reactions/:reactionId
const updateReaction = async (req, res) => {
  const { reactionId } = req.params;
  const { newReaction } = req.body;
  const userId = req.user.user_id;

  try {
    // Optional: Verify the reaction belongs to the user
    const existing = await db.query(
      `SELECT * FROM message_reactions WHERE reaction_id = $1 AND user_id = $2`,
      [reactionId, userId]
    );

    if (existing.rows.length === 0) {
      return res
        .status(403)
        .json({ error: "Not allowed to edit this reaction" });
    }

    const result = await db.query(
      `UPDATE message_reactions SET reaction = $1, reacted_at = NOW()
       WHERE reaction_id = $2 RETURNING *`,
      [newReaction, reactionId]
    );

    return res.status(200).json({ updated: result.rows[0] });
  } catch (err) {
    console.error("❌ Failed to update reaction:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE /api/reactions/:reactionId
const deleteReaction = async (req, res) => {
  const { reactionId } = req.params;
  const userId = req.user.user_id;

  try {
    const existing = await db.query(
      `SELECT * FROM message_reactions WHERE reaction_id = $1 AND user_id = $2`,
      [reactionId, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(403).json({ error: "You cannot delete this reaction" });
    }

    await db.query(`DELETE FROM message_reactions WHERE reaction_id = $1`, [
      reactionId,
    ]);

    return res.status(200).json({ deleted: true });
  } catch (err) {
    console.error("❌ Failed to delete reaction:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  toggleReactionController,
  getReactionsByMessage,
  getReactionsByConversation,
  updateReaction,
  deleteReaction,
};
