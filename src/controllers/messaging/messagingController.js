// This file is part of the Zone 25-14 project.
// Licensed under the GNU General Public License v3.0.
// Description: Messaging controller for handling conversations, messages, and members
// Functions: createConversation, addMember, sendMessage, getMessages
// Dependencies: Conversation, ConversationMember, Message models, socket.io, notification service

const { getIO } = require("../../config/socket.js");
const Conversation = require("../../models/conversationModel");
const ConversationMember = require("../../models/conversationMemberModel");
const Message = require("../../models/messageModel");
const pool = require("../../config/db");
const { updateLastMessageTime } = require("../users/relationshipController");
const { getUserWithRole } = require("../../models/userModel");
const { getConversationById } = require("../../models/conversationModel");
const { sendNotification } = require("../../services/notificationService");
const {
  getDefaultNotificationContent,
  generateAdditionalInfo,
} = require("../../utils/notificationHelpers");

// ✅ CREATE Conversation
const createConversation = async (req, res) => {
  try {
    const { isGroup, groupName, memberIds } = req.body;
    const user_id = req.user.user_id;

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
        return res.status(200).json({
          conversation: { conversation_id: existing.rows[0].conversation_id },
          existing: true,
        });
      }
    }

    const convo = await Conversation.createConversation(
      isGroup,
      isGroup ? groupName : null,
      user_id
    );

    await ConversationMember.addMemberToConversation(
      convo.conversation_id,
      user_id,
      "owner"
    );

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

// ✅ ADD Member to Conversation
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

    const convo = await getConversationById(conversationId);
    const senderInfo = await getUserWithRole(user_id);
    const senderName = senderInfo?.username || "Someone";

    await sendNotification(
      newMemberId,
      "message",
      getDefaultNotificationContent("message", {
        senderName,
        eventName: convo?.group_name || "a group chat",
      }),
      `/chat/${conversationId}`
    );

    return res.status(200).json({ message: "Member added and notified." });
  } catch (err) {
    console.error("addMember error:", err);
    return res.status(500).json({ error: "Failed to add member" });
  }
};

// ✅ SEND Message
const sendMessage = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { conversationId, content, replyToMessageId, media_url, media_type } =
      req.body;

    if (!conversationId || (!content && !media_url)) {
      return res
        .status(400)
        .json({ error: "Message must have either content or media." });
    }

    const message = await Message.sendMessage(
      conversationId,
      user_id,
      content || "", // default to "" if only media is sent
      replyToMessageId || null,
      media_url || null,
      media_type || null
    );

    const senderRes = await pool.query(
      `SELECT username FROM users WHERE user_id = $1`,
      [user_id]
    );
    const username = senderRes.rows[0]?.username || "Unknown";

    let replyToMessage = null;
    if (replyToMessageId) {
      const replyRes = await pool.query(
        `SELECT message_id, content, sender_id FROM messages WHERE message_id = $1`,
        [replyToMessageId]
      );
      if (replyRes.rows.length > 0) {
        const replyUserRes = await pool.query(
          `SELECT username FROM users WHERE user_id = $1`,
          [replyRes.rows[0].sender_id]
        );
        replyToMessage = {
          message_id: replyRes.rows[0].message_id,
          content: replyRes.rows[0].content,
          username: replyUserRes.rows[0]?.username || "Unknown",
        };
      }
    }

    const memberRes = await pool.query(
      `SELECT user_id FROM conversation_members WHERE conversation_id = $1`,
      [conversationId]
    );

    if (memberRes.rows.length === 2) {
      const friendId = memberRes.rows.find(
        (m) => m.user_id !== user_id
      )?.user_id;
      if (friendId) {
        await updateLastMessageTime(user_id, friendId);
        await updateLastMessageTime(friendId, user_id);
      }
    }

    const fullMessage = {
      message_id: message.message_id,
      conversation_id: conversationId,
      sender_id: user_id,
      username,
      content: message.content,
      sent_at: message.sent_at,
      media_url: message.media_url,
      media_type: message.media_type,
      reply_to_message: replyToMessage || undefined,
    };

    getIO().to(conversationId).emit("receiveMessage", fullMessage);

    const io = getIO();
    const room = io.sockets.adapter.rooms.get(conversationId);
    const socketsInRoom = room ? Array.from(room) : [];

    for (const member of memberRes.rows) {
      const targetId = member.user_id;
      if (targetId === user_id) continue;

      const targetSocketId =
        await require("../../config/socket").getSocketIdByUserId(targetId);
      const isViewingRoom =
        targetSocketId && socketsInRoom.includes(targetSocketId);

      if (!isViewingRoom) {
        const preview =
          content.length > 40 ? content.slice(0, 40) + "..." : content;
        const additional_info = generateAdditionalInfo(
          replyToMessageId ? "reply" : "message",
          { preview }
        );

        await sendNotification(
          targetId,
          replyToMessageId ? "reply" : "message",
          getDefaultNotificationContent(
            replyToMessageId ? "reply" : "message",
            {
              senderName: username,
            }
          ),
          `/chat/${conversationId}`,
          {},
          additional_info
        );
      }
    }

    return res.status(201).json({ message: fullMessage });
  } catch (err) {
    console.error("Send message error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ GET Messages
const getMessages = async (req, res) => {
  const { conversationId, before, limit = 30 } = req.query;

  if (!conversationId) {
    return res.status(400).json({ error: "Missing conversationId" });
  }

  try {
    const values = [conversationId];
    let query = `
      SELECT 
        m.message_id,
        m.sender_id,
        u.username,
        m.content,
        m.sent_at,
        m.reply_to_id,
        m.media_url,
        m.media_type,
        r.content AS reply_to_content,
        ru.username AS reply_to_username
      FROM messages m
      JOIN users u ON u.user_id = m.sender_id
      LEFT JOIN messages r ON m.reply_to_id = r.message_id
      LEFT JOIN users ru ON r.sender_id = ru.user_id
      WHERE m.conversation_id = $1 AND m.is_deleted = false
    `;

    if (before) {
      query += ` AND m.sent_at < (SELECT sent_at FROM messages WHERE message_id = $2)`;
      values.push(before);
    }

    query += ` ORDER BY m.sent_at DESC LIMIT $${values.length + 1}`;
    values.push(limit);

    const messagesResult = await pool.query(query, values);
    const messages = messagesResult.rows;

    const messageIds = messages.map((msg) => msg.message_id);
    let reactionsMap = new Map();

    if (messageIds.length > 0) {
      const reactionQuery = `
        SELECT 
          mr.reaction_id,
          mr.message_id,
          mr.user_id,
          u.username,
          mr.reaction,
          mr.reacted_at
        FROM message_reactions mr
        JOIN users u ON u.user_id = mr.user_id
        WHERE mr.message_id = ANY($1)
      `;
      const reactionResult = await pool.query(reactionQuery, [messageIds]);

      reactionResult.rows.forEach((reaction) => {
        if (!reactionsMap.has(reaction.message_id)) {
          reactionsMap.set(reaction.message_id, []);
        }
        reactionsMap.get(reaction.message_id).push({
          reaction_id: reaction.reaction_id,
          user_id: reaction.user_id,
          username: reaction.username,
          message_id: reaction.message_id,
          reaction: reaction.reaction,
          reacted_at: reaction.reacted_at,
        });
      });
    }

    const formattedMessages = messages.map((msg) => ({
      message_id: msg.message_id,
      sender_id: msg.sender_id,
      username: msg.username,
      content: msg.content,
      sent_at: msg.sent_at,
      reply_to_id: msg.reply_to_id,
      reply_to_message: msg.reply_to_id
        ? {
            message_id: msg.reply_to_id,
            username: msg.reply_to_username,
            content: msg.reply_to_content,
          }
        : undefined,
      media_url: msg.media_url,
      media_type: msg.media_type,
      reactions: reactionsMap.get(msg.message_id) || [],
    }));

    const hasMore = messages.length === parseInt(limit);
    res.json({ messages: formattedMessages, hasMore });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  createConversation,
  addMember,
  sendMessage,
  getMessages,
};
