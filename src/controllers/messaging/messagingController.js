// Description: Message model for handling message-related database operations
// Functions: createConversation, getConversationById
// Dependencies: pg (PostgreSQL client), db configuration
// File: src/models/conversationModel.js
const { getIO } = require("../../config/socket.js");
const Conversation = require("../../models/conversationModel");
const ConversationMember = require("../../models/conversationMemberModel");
const pool = require("../../config/db");

const createConversation = async (req, res) => {
  try {
    const { isGroup, groupName, memberIds } = req.body;
    const user_id = req.user.user_id;

    // 🔒 Only check for existing convo if it's 1-on-1
    if (!isGroup && memberIds.length === 1) {
      const existing = await pool.query(
        `SELECT c.conversation_id
         FROM conversations c
         JOIN conversation_members cm1 ON cm1.conversation_id = c.conversation_id
         JOIN conversation_members cm2 ON cm2.conversation_id = c.conversation_id
         WHERE c.is_group = false
           AND cm1.user_id = $1 AND cm2.user_id = $2
         LIMIT 1`,
        [user_id, memberIds[0]]
      );

      if (existing.rows.length) {
        // ✅ Return the existing convo instead of creating a new one
        return res.status(200).json({
          conversation: { conversation_id: existing.rows[0].conversation_id },
          existing: true,
        });
      }
    }

    // 🧱 Create a new conversation
    const convo = await Conversation.createConversation(
      isGroup,
      isGroup ? groupName : null,
      user_id
    );

    // Add creator as owner
    await ConversationMember.addMemberToConversation(
      convo.conversation_id,
      user_id,
      "owner"
    );

    // Add other members
    if (Array.isArray(memberIds)) {
      for (const id of memberIds) {
        if (id !== user_id) {
          await ConversationMember.addMemberToConversation(
            convo.conversation_id,
            id
          );
        }
      }
    }

    return res.status(201).json({ conversation: convo });
  } catch (err) {
    console.error("createConversation error:", err);
    return res.status(500).json({ error: "Failed to create conversation" });
  }
};


const addMember = async (req, res) => {
  try {
    const { conversationId, newMemberId } = req.body;
    const user_id = req.user.user_id;

    const members = await ConversationMember.getConversationMembers(
      conversationId
    );
    const caller = members.find((m) => m.user_id === user_id);

    if (!caller || !["owner", "admin"].includes(caller.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    await ConversationMember.addMemberToConversation(
      conversationId,
      newMemberId
    );
    return res.status(200).json({ message: "Member added" });
  } catch (err) {
    console.error("addMember error:", err);
    return res.status(500).json({ error: "Failed to add member" });
  }
};

const Message = require("../../models/messageModel");

const sendMessage = async (req, res) => {
  try {
    const { conversationId, content } = req.body;
    const user_id = req.user.user_id;

    const convoCheck = await pool.query(
      `SELECT is_group FROM conversations WHERE conversation_id = $1`,
      [conversationId]
    );

    if (!convoCheck.rows.length)
      return res.status(404).json({ error: "Conversation not found" });

    const isGroup = convoCheck.rows[0].is_group;

    const members = await ConversationMember.getConversationMembers(
      conversationId
    );
    const sender = members.find((m) => m.user_id === user_id);

    if (!sender)
      return res.status(403).json({ error: "You are not in this chat" });
    if (sender.role === "muted")
      return res.status(403).json({ error: "You are muted" });

    const message = await Message.sendMessage(conversationId, user_id, content);

    // ✅ Get sender username for frontend display
    const userRes = await pool.query(
      `SELECT username FROM users WHERE user_id = $1`,
      [user_id]
    );
    const username = userRes.rows[0]?.username || "Unknown";

    // ✅ Emit real-time message to all participants
    getIO().to(conversationId).emit("receiveMessage", {
      message_id: message.message_id,
      username,
      content: message.content,
      sent_at: message.sent_at,
    });

    // 🔁 Handle friend check only if not group
    if (!isGroup) {
      const friendId = members.find((m) => m.user_id !== user_id)?.user_id;

      const isFriend = await pool.query(
        `SELECT 1 FROM friends 
         WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
           AND is_removed = false AND is_blocked = false`,
        [user_id, friendId]
      );

      if (!isFriend.rows.length) {
        await pool.query(
          `INSERT INTO message_requests (sender_id, receiver_id, content)
           VALUES ($1, $2, $3)`,
          [user_id, friendId, content]
        );
        return res
          .status(202)
          .json({ message: "Message request sent and pending approval." });
      }
    }

    return res.status(201).json({ message });
  } catch (err) {
    console.error("sendMessage error:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const user_id = req.user?.user_id;

    console.log("🔍 user_id from token:", user_id);

    const members = await ConversationMember.getConversationMembers(
      conversationId
    );
    console.log("🔍 Members in conversation:", members);

    if (!user_id || !members.some((m) => m.user_id === user_id)) {
      return res.status(403).json({ error: "Access denied" });
    }

    const messages = await Message.getMessagesByConversation(conversationId);
    return res.status(200).json({ messages });
  } catch (err) {
    console.error("getMessages error:", err);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
};

const MessageReaction = require("../../models/messageReactionModel");

const reactToMessage = async (req, res) => {
  try {
    const { messageId, reaction } = req.body;
    const user_id = req.user.user_id;

    const react = await MessageReaction.addReaction(
      messageId,
      user_id,
      reaction
    );
    return res.status(200).json({ reaction: react });
  } catch (err) {
    console.error("reactToMessage error:", err);
    return res.status(500).json({ error: "Failed to add reaction" });
  }
};

module.exports = {
  createConversation,
  addMember,
  sendMessage,
  getMessages,
  reactToMessage,
};
