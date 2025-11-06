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

const {
  getConversation, // NEW
  listMembers, // NEW
  inviteMembers, // NEW (bulk add)
  leaveConversation, // NEW
  removeMember, // NEW (kick)
  changeMemberRole, // NEW (promote/demote)
  transferOwnership, // NEW
  updateConversation, // NEW (name/avatar)
  muteConversation, // NEW (per user)
  pinConversation, // NEW (per user)
  deleteConversation, // NEW (owner only)
} = require("../../controllers/messaging/messagingController");

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

// All routes protected
router.use(protectRoute);

// Conversations
router.get("/conversations/list", listConversations);
router.get("/conversations/:id", getConversation); // ← details
router.get("/conversations/:id/members", listMembers); // ← roster

router.post("/conversations", requireMessagingAllowed(), createConversation);
router.post("/conversations/:id/read", markConversationRead);

// Membership mgmt
router.post("/conversations/:id/invite", inviteMembers); // ← add many
router.post("/conversations/:id/leave", leaveConversation);
router.post("/conversations/:id/remove-member", removeMember);
router.post("/conversations/:id/role", changeMemberRole);
router.post("/conversations/:id/transfer-ownership", transferOwnership);

// Settings (group)
router.patch("/conversations/:id", updateConversation); // name/avatar
router.post("/conversations/:id/mute", muteConversation); // per user
router.post("/conversations/:id/pin", pinConversation); // per user
router.delete("/conversations/:id", deleteConversation); // owner only

// Inbox + messages (as you have)
router.get("/requests", messageRequestController.getIncomingRequests);
router.post(
  "/requests",
  requireMessagingAllowed(),
  messageRequestController.createMessageRequest
);
router.post(
  "/requests/:id/accept",
  messageRequestController.acceptMessageRequest
);
router.post(
  "/requests/:id/reject",
  messageRequestController.declineMessageRequest
);

router.post("/messages", sendMessage);
router.get("/messages/:conversationId", getMessages);

module.exports = router;
