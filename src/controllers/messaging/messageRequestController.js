// File: zone-25-14-backend/src/controllers/messaging/messageRequestController.js
// This file is part of the Zone 25-14 project.
// Licensed under the GNU General Public License v3.0.
// Description: Handles incoming message requests, accepting or declining them
// Functions: getIncomingRequests, acceptMessageRequest, declineMessageRequest
// Dependencies: MessageRequest, Conversation, ConversationMember, Message models, notification service

const pool = require("../../config/db");
const { getIO } = require("../../config/socket");
const MessageRequest = require("../../models/messageRequestModel");
const Conversation = require("../../models/conversationModel");
const ConversationMember = require("../../models/conversationMemberModel");
const Message = require("../../models/messageModel");
const { sendNotification } = require("../../services/notificationService");
const NotificationTypes = require("../../models/notificationModel");
const { generateAdditionalInfo } = require("../../utils/notificationHelpers");

// ✅ Create a new message request
const createMessageRequest = async (req, res) => {
  try {
    const senderId = req.user.user_id || req.user.userId; // normalize
    const { toUserId, content } = req.body;

    if (!toUserId) return res.status(400).json({ error: "toUserId required" });
    if (toUserId === senderId)
      return res.status(400).json({ error: "Cannot message yourself" });

    // optional: prevent duplicate pending pair (also enforced by unique index if you added it)
    const dup = await pool.query(
      `SELECT 1 FROM public.message_requests
       WHERE ((sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1))
         AND status='pending' LIMIT 1`,
      [senderId, toUserId]
    );
    if (dup.rows.length) {
      return res
        .status(200)
        .json({ pending: true, message: "Request already pending" });
    }

    // INSERT: let DEFAULT 'pending' fill in
    // createMessageRequest
    const { rows } = await pool.query(
      `INSERT INTO public.message_requests (sender_id, receiver_id, content)
      VALUES ($1, $2, COALESCE($3, ''))
      RETURNING request_id, created_at`,
      [senderId, toUserId, content]
    );

    // (optional) socket notify recipient here…

    return res
      .status(201)
      .json({ request_id: rows[0].request_id, pending: true });
  } catch (e) {
    console.error("createMessageRequest:", e);
    return res.status(500).json({ error: "Failed to send request" });
  }
};

// ✅ Fetch incoming message requests for the user
const getIncomingRequests = async (req, res) => {
  try {
    const userId = req.user.user_id || req.user.userId;

    const { rows } = await pool.query(
      `
      SELECT
        mr.request_id,
        mr.sender_id AS from_user_id,
        u.username   AS from_username,
        u.profile_picture AS from_avatar,
        mr.created_at AS sent_at,
        LEFT(COALESCE(mr.content, ''), 140) AS preview
      FROM public.message_requests mr
      JOIN public.users u ON u.user_id = mr.sender_id
      WHERE mr.receiver_id = $1 AND mr.status = 'pending'
      ORDER BY mr.created_at DESC
      `,
      [userId]
    );

    // Frontend expects an array; keep it simple.
    return res.status(200).json(rows);
  } catch (err) {
    console.error("getIncomingRequests:", err);
    return res.status(500).json({ error: "Failed to fetch message requests" });
  }
};

// ✅ Accept a message request (with optional replyContent to send immediately)
const acceptMessageRequest = async (req, res) => {
  try {
    const receiverId = req.user.user_id || req.user.userId; // normalize
    const { id } = req.params; // request_id
    const { replyContent } = req.body || {}; // optional

    // 1) Load the request with status
    const { rows: rRows } = await pool.query(
      `SELECT request_id, sender_id, receiver_id, content, status
         FROM public.message_requests
        WHERE request_id = $1`,
      [id]
    );
    const reqRow = rRows[0];
    if (!reqRow || reqRow.receiver_id !== receiverId) {
      return res.status(403).json({ error: "Not authorized" }); // 👈 your 403 was here
    }
    if (reqRow.status !== "pending") {
      return res.status(400).json({ error: "Request already handled" });
    }

    const senderId = reqRow.sender_id;

    // 2) Find or create a 1-on-1 conversation for these two users
    const { rows: convoExisting } = await pool.query(
      `
      SELECT c.conversation_id
        FROM public.conversations c
        JOIN public.conversation_members cm1 ON cm1.conversation_id = c.conversation_id AND cm1.user_id = $1
        JOIN public.conversation_members cm2 ON cm2.conversation_id = c.conversation_id AND cm2.user_id = $2
       WHERE c.is_group = FALSE
       LIMIT 1
      `,
      [senderId, receiverId]
    );

    let conversationId;
    if (convoExisting.length) {
      conversationId = convoExisting[0].conversation_id;
    } else {
      const { rows: created } = await pool.query(
        `INSERT INTO public.conversations (is_group, group_name) VALUES (FALSE, NULL) RETURNING conversation_id`
      );
      conversationId = created[0].conversation_id;

      // ensure both members exist
      await pool.query(
        `INSERT INTO public.conversation_members (conversation_id, user_id, role)
         VALUES ($1, $2, 'member'), ($1, $3, 'member')
         ON CONFLICT DO NOTHING`,
        [conversationId, senderId, receiverId]
      );
    }

    // 3) Seed messages:
    //    a) original request content as a first message FROM the sender (if not empty)
    //    b) optional reply message from the receiver (if provided)
    let requestMessageId = null;
    const initialText = (reqRow.content || "").trim();
    if (initialText) {
      const sent = await Message.sendMessage(
        conversationId,
        senderId,
        initialText,
        null,
        null,
        null
      );
      requestMessageId = sent?.message_id ?? null;
    }

    let replyMessageId = null;
    const replyText = (replyContent || "").trim();
    if (replyText) {
      const sent2 = await Message.sendMessage(
        conversationId,
        receiverId,
        replyText,
        null,
        null,
        null
      );
      replyMessageId = sent2?.message_id ?? null;
    }

    // 4) Mark request accepted
    await pool.query(
      `UPDATE public.message_requests SET status='accepted' WHERE request_id=$1`,
      [id]
    );

    // 5) (Optional) notify sender via socket
    try {
      const { getSocketIdByUserId } = require("../../config/socket");
      const sock = await getSocketIdByUserId(senderId);
      if (sock) {
        getIO().to(sock).emit("messageRequestAccepted", {
          requestId: id,
          conversationId,
        });
      }
    } catch {}

    return res.status(200).json({
      message: "Message request accepted",
      conversationId,
      seeded: { requestMessageId, replyMessageId },
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
  createMessageRequest,
};
