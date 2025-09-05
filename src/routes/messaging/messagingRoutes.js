// Description: Message model for handling message-related database operations
// Functions: createConversation, getConversationById
// Dependencies: pg (PostgreSQL client), db configuration
// File: src/routes/messaging/messagingRoutes.js
const express = require("express");
const router = express.Router();

const {
  createConversation,
  addMember,
  sendMessage,
  getMessages,
  listConversations,
  markConversationRead,
  reactToMessage,
} = require("../../controllers/messaging/messagingController");
const {
  requireMessagingAllowed,
} = require("../../middleware/privacyMiddleware");
const messageRequestController = require("../../controllers/messaging/messageRequestController");

const { protectRoute } = require("../../middleware/authMiddleware");

// All routes protected
router.use(protectRoute);

// ✅ conversations list + read
// listConversations
router.get("/conversations/list", listConversations);
// markConversationRead
router.post("/conversations/:id/read", markConversationRead);

// ✅ Inbox requests

//🔹 Get incoming message requests
router.get("/requests", messageRequestController.getIncomingRequests);
//🔹 Create a new message request
router.post(
  "/requests",
  requireMessagingAllowed(),
  messageRequestController.createMessageRequest
);
//🔹 Accept a message request
router.post(
  "/requests/:id/accept",
  messageRequestController.acceptMessageRequest
);
//🔹 Decline a message request
router.post(
  "/requests/:id/reject",
  messageRequestController.declineMessageRequest
);

// ✅ Messages

// 🔹 Fetch all conversations for the authenticated user
router.get("/messages", getMessages);

// 🔹 Create a new conversation (1-on-1 or group) (when memberIds has exactly one other user)
router.post("/conversations", requireMessagingAllowed(), createConversation);

// 🔹 Add member to group (only owner/admin)
router.post("/conversations/add-member", addMember);

// 🔹 Send a message
router.post("/messages", sendMessage);

// 🔹 Fetch messages in a conversation
router.get("/messages/:conversationId", getMessages);

module.exports = router;
