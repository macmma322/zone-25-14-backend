// File: src/routes/messaging/reactionRoutes.js
// Description: Reaction routes for handling message reactions in conversations

const express = require("express");
const router = express.Router();
const { protectRoute } = require("../../middleware/authMiddleware");
const {
  toggleReactionController,
  getReactionsByMessage,
  getReactionsByConversation,
  updateReaction,
  deleteReaction,
} = require("../../controllers/messaging/reactionController");

router.post("/", protectRoute, toggleReactionController);
router.get("/", protectRoute, getReactionsByMessage);
router.get("/byConversation", protectRoute, getReactionsByConversation);
router.patch("/:reactionId", protectRoute, updateReaction);
router.delete("/:reactionId", protectRoute, deleteReaction);

module.exports = router;
