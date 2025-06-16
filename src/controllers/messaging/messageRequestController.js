// Description: Message model for handling message-related database operations
// Functions: getIncomingRequests, acceptMessageRequest, declineMessageRequest
// Dependencies: pg (PostgreSQL client), db configuration, models for MessageRequest, Conversation, ConversationMember, and Message
// File: src/controllers/messaging/messageRequestController.js
const pool = require("../../config/db");
const MessageRequest = require("../../models/MessageRequest");
const Conversation = require("../../models/Conversation");
const ConversationMember = require("../../models/ConversationMember");
const Message = require("../../models/Message");
const { sendNotification } = require("../../services/notificationService");
const NotificationTypes = require("../../models/notificationTypes");


const getIncomingRequests = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { rows } = await pool.query(
      `SELECT mr.request_id, mr.content, mr.sent_at, u.username, u.profile_picture
       FROM message_requests mr
       JOIN users u ON mr.sender_id = u.user_id
       WHERE mr.receiver_id = $1 AND mr.status = 'pending'
       ORDER BY mr.sent_at DESC`,
      [userId]
    );

    res.status(200).json({ requests: rows });
  } catch (err) {
    console.error("getIncomingRequests:", err);
    res.status(500).json({ error: "Failed to fetch message requests" });
  }
};

const acceptMessageRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const receiverId = req.user.userId;

    const request = await MessageRequest.getRequestById(id);
    if (!request || request.receiver_id !== receiverId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: "Request already handled" });
    }

    // Create a new 1-on-1 conversation
    const convo = await Conversation.createConversation(
      false,
      null,
      receiverId
    );

    await ConversationMember.addMemberToConversation(
      convo.conversation_id,
      receiverId,
      "member"
    );
    await ConversationMember.addMemberToConversation(
      convo.conversation_id,
      request.sender_id,
      "member"
    );

    await Message.sendMessage(
      convo.conversation_id,
      request.sender_id,
      request.content
    );

    await MessageRequest.updateRequestStatus(id, "accepted");

    res.status(200).json({
      message: "Message request accepted",
      conversationId: convo.conversation_id,
    });
  } catch (err) {
    console.error("acceptMessageRequest:", err);
    res.status(500).json({ error: "Failed to accept request" });
  }
};

const declineMessageRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const receiverId = req.user.userId;

    const request = await MessageRequest.getRequestById(id);
    if (!request || request.receiver_id !== receiverId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: "Request already handled" });
    }

    await MessageRequest.updateRequestStatus(id, "declined");
    res.status(200).json({ message: "Message request declined" });
  } catch (err) {
    console.error("declineMessageRequest:", err);
    res.status(500).json({ error: "Failed to decline request" });
  }
};

module.exports = {
  getIncomingRequests,
  acceptMessageRequest,
  declineMessageRequest,
};
