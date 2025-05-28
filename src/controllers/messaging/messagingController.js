// Description: Message model for handling message-related database operations
// Functions: createConversation, getConversationById
// Dependencies: pg (PostgreSQL client), db configuration
// File: src/models/conversationModel.js
const Conversation = require("../../models/conversationModel");
const ConversationMember = require("../../models/conversationMemberModel");

const createConversation = async (req, res) => {
  try {
    const { isGroup, groupName, memberIds } = req.body;
    const userId = req.user.user_id;

    const convo = await Conversation.createConversation(
      isGroup,
      isGroup ? groupName : null,
      userId
    );

    // Add creator as owner
    await ConversationMember.addMemberToConversation(
      convo.conversation_id,
      userId,
      "owner"
    );

    // Add other members
    if (Array.isArray(memberIds)) {
      for (const id of memberIds) {
        if (id !== userId) {
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
    const userId = req.user.user_id;

    const members = await ConversationMember.getConversationMembers(
      conversationId
    );
    const caller = members.find((m) => m.user_id === userId);

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
    const userId = req.user.userId;

    const convoCheck = await pool.query(
      `SELECT is_group FROM conversations WHERE conversation_id = $1`,
      [conversationId]
    );

    if (!convoCheck.rows.length) return res.status(404).json({ error: 'Conversation not found' });

    const isGroup = convoCheck.rows[0].is_group;

    const members = await ConversationMember.getConversationMembers(conversationId);
    const sender = members.find(m => m.user_id === userId);
    if (!sender) return res.status(403).json({ error: 'You are not in this chat' });
    if (sender.role === 'muted') return res.status(403).json({ error: 'You are muted' });

    if (isGroup) {
      const message = await Message.sendMessage(conversationId, userId, content);
      return res.status(201).json({ message });
    }

    // 1-on-1 chat — check friendship
    const friendId = members.find(m => m.user_id !== userId).user_id;

    const isFriend = await pool.query(
      `SELECT 1 FROM friends 
       WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
         AND is_removed = false AND is_blocked = false`,
      [userId, friendId]
    );

    if (isFriend.rows.length) {
      const message = await Message.sendMessage(conversationId, userId, content);
      return res.status(201).json({ message });
    }

    // Not friends → Send message request
    await pool.query(
      `INSERT INTO message_requests (sender_id, receiver_id, content)
       VALUES ($1, $2, $3)`,
      [userId, friendId, content]
    );

    return res.status(202).json({ message: 'Message request sent and pending approval.' });
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ error: 'Failed to send message' });
  }
};

const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.user_id;

    const members = await ConversationMember.getConversationMembers(
      conversationId
    );
    if (!members.some((m) => m.user_id === userId)) {
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
    const userId = req.user.user_id;

    const react = await MessageReaction.addReaction(
      messageId,
      userId,
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
