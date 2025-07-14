// File: zone-25-14-backend/src/controllers/messaging/messageRequestController.js
// This file is part of the Zone 25-14 project.
// Licensed under the GNU General Public License v3.0.
// Description: Handles incoming message requests, accepting or declining them
// Functions: getIncomingRequests, acceptMessageRequest, declineMessageRequest
// Dependencies: MessageRequest, Conversation, ConversationMember, Message models, notification service

const pool = require("../../config/db");
const MessageRequest = require("../../models/MessageRequest");
const Conversation = require("../../models/Conversation");
const ConversationMember = require("../../models/ConversationMember");
const Message = require("../../models/Message");
const { sendNotification } = require("../../services/notificationService");
const NotificationTypes = require("../../models/notificationTypes");
const { generateAdditionalInfo } = require("../../utils/notificationHelpers");

// ✅ Fetch incoming message requests for the user
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
// ✅ Accept a message request

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

    // 1. Create a new 1-on-1 conversation
    const convo = await Conversation.createConversation(
      false,
      null,
      receiverId
    );

    // 2. Add members to the conversation
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

    // 3. Send the initial message (from the request)
    await Message.sendMessage(
      convo.conversation_id,
      request.sender_id,
      request.content
    );

    // 4. Update the request status to accepted
    await MessageRequest.updateRequestStatus(id, "accepted");

    // 5. Notify sender
    const senderInfo = await pool.query(
      `SELECT username FROM users WHERE user_id = $1`,
      [request.sender_id]
    );
    const senderUsername = senderInfo.rows[0]?.username || "Someone";

    const receiverInfo = await pool.query(
      `SELECT username FROM users WHERE user_id = $1`,
      [receiverId]
    );
    const receiverUsername = receiverInfo.rows[0]?.username || "Someone";

    await sendNotification(
      request.sender_id,
      "message",
      `${receiverUsername} has accepted your message request.`,
      `/chat/${convo.conversation_id}`,
      {
        additional_info: generateAdditionalInfo("message", {
          nickname: receiverUsername,
        }),
      }
    );

    res.status(200).json({
      message: "Message request accepted",
      conversationId: convo.conversation_id,
    });
  } catch (err) {
    console.error("acceptMessageRequest:", err);
    res.status(500).json({ error: "Failed to accept request" });
  }
};

// ✅ Decline a message request
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

    // 1. Update the request status to declined
    await MessageRequest.updateRequestStatus(id, "declined");

    // 2. Notify sender
    const receiverInfo = await pool.query(
      `SELECT username FROM users WHERE user_id = $1`,
      [receiverId]
    );
    const receiverUsername = receiverInfo.rows[0]?.username || "Someone";

    await sendNotification(
      request.sender_id,
      "message",
      `${receiverUsername} has declined your message request.`,
      undefined,
      {
        additional_info: generateAdditionalInfo("message", {
          nickname: receiverUsername,
        }),
      }
    );

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
