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
  reactToMessage,
} = require("../../controllers/messaging/messagingController");

const { protectRoute } = require("../../middleware/authMiddleware");

// All routes protected
router.use(protectRoute);

// 🔹 Fetch all conversations for the authenticated user
router.get("/messages", getMessages);

// 🔹 Create a new conversation (1-on-1 or group)
router.post("/conversations", createConversation);

// 🔹 Add member to group (only owner/admin)
router.post("/conversations/add-member", addMember);

// 🔹 Send a message
router.post("/messages", sendMessage);

// 🔹 Fetch messages in a conversation
router.get("/messages/:conversationId", getMessages);

module.exports = router;
