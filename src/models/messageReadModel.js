// File: src/models/messageReadModel.js
// Description: Message read model for tracking individual message read status
// Functions: markMessagesAsRead, getMessageReads, getConversationReadStatus

const pool = require("../config/db");

/**
 * Mark messages as read by a user up to a certain timestamp
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - User ID marking messages as read
 * @param {Date} upToTimestamp - Mark all messages up to this timestamp as read
 */
const markMessagesAsRead = async (conversationId, userId, upToTimestamp) => {
  try {
    // Get all unread messages in the conversation up to the timestamp
    const { rows: unreadMessages } = await pool.query(
      `SELECT message_id 
       FROM messages 
       WHERE conversation_id = $1 
         AND sender_id != $2
         AND sent_at <= $3
         AND is_deleted = false
         AND message_id NOT IN (
           SELECT message_id 
           FROM message_reads 
           WHERE user_id = $2
         )`,
      [conversationId, userId, upToTimestamp]
    );

    // Insert read records for each unread message
    if (unreadMessages.length > 0) {
      const values = unreadMessages.map((msg) => [msg.message_id, userId]);
      const placeholders = values
        .map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`)
        .join(", ");

      await pool.query(
        `INSERT INTO message_reads (message_id, user_id) 
         VALUES ${placeholders}
         ON CONFLICT (message_id, user_id) DO NOTHING`,
        values.flat()
      );

      return unreadMessages.map((m) => m.message_id);
    }

    return [];
  } catch (error) {
    console.error("Error marking messages as read:", error);
    throw error;
  }
};

/**
 * Get read status for specific messages
 * @param {string[]} messageIds - Array of message IDs
 * @returns {Promise<Object>} Map of message_id to array of users who read it
 */
const getMessageReads = async (messageIds) => {
  if (!messageIds || messageIds.length === 0) {
    return {};
  }

  try {
    const { rows } = await pool.query(
      `SELECT 
        mr.message_id,
        mr.user_id,
        mr.read_at,
        u.username,
        u.profile_picture as avatar
       FROM message_reads mr
       JOIN users u ON u.user_id = mr.user_id
       WHERE mr.message_id = ANY($1)
       ORDER BY mr.read_at ASC`,
      [messageIds]
    );

    // Group by message_id
    const readsByMessage = {};
    rows.forEach((row) => {
      if (!readsByMessage[row.message_id]) {
        readsByMessage[row.message_id] = [];
      }
      readsByMessage[row.message_id].push({
        user_id: row.user_id,
        username: row.username,
        avatar: row.avatar,
        read_at: row.read_at,
      });
    });

    return readsByMessage;
  } catch (error) {
    console.error("Error getting message reads:", error);
    throw error;
  }
};

/**
 * Get read status for all messages in a conversation
 * @param {string} conversationId - Conversation ID
 * @param {number} limit - Number of recent messages to check
 * @returns {Promise<Object>} Map of message_id to array of users who read it
 */
const getConversationReadStatus = async (conversationId, limit = 50) => {
  try {
    const { rows: messages } = await pool.query(
      `SELECT message_id 
       FROM messages 
       WHERE conversation_id = $1 
         AND is_deleted = false
       ORDER BY sent_at DESC
       LIMIT $2`,
      [conversationId, limit]
    );

    const messageIds = messages.map((m) => m.message_id);
    return await getMessageReads(messageIds);
  } catch (error) {
    console.error("Error getting conversation read status:", error);
    throw error;
  }
};

/**
 * Check if a message has been seen by anyone other than the sender
 * @param {string} messageId - Message ID
 * @param {string} senderId - Sender user ID
 * @returns {Promise<boolean>} True if seen by others
 */
const isMessageSeenByOthers = async (messageId, senderId) => {
  try {
    const { rows } = await pool.query(
      `SELECT 1
       FROM message_reads
       WHERE message_id = $1
         AND user_id != $2
       LIMIT 1`,
      [messageId, senderId]
    );

    return rows.length > 0;
  } catch (error) {
    console.error("Error checking if message is seen:", error);
    throw error;
  }
};

module.exports = {
  markMessagesAsRead,
  getMessageReads,
  getConversationReadStatus,
  isMessageSeenByOthers,
};
