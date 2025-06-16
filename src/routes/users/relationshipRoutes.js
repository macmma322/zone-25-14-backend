const express = require("express");
const router = express.Router();
const { protectRoute } = require("../../middleware/authMiddleware");
const pool = require("../../config/db");

const {
  getRelationshipStatus,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  togglePinnedFriend,
  resetUnreadCount,
  getFriendsList,
} = require("../../controllers/users/relationshipController");

// ✅ GET relationship status with a user
router.get("/relationship/:username", protectRoute, getRelationshipStatus);

// ✅ POST send a new friend request
router.post("/friends/request", protectRoute, sendFriendRequest);

// ✅ DELETE cancel a pending friend request
router.delete("/friends/request", protectRoute, cancelFriendRequest);

// ✅ POST accept an incoming friend request
router.post("/friends/accept", protectRoute, acceptFriendRequest);

// ✅ POST decline an incoming friend request
router.post("/friends/decline", protectRoute, declineFriendRequest);

// ✅ GET full list of friends (with pinned + sorted by last message time)
router.get("/friends/list", protectRoute, getFriendsList);

// ✅ PATCH toggle pinned state for a friend
router.patch("/friends/pin", protectRoute, togglePinnedFriend);

// ✅ PATCH reset unread message count for a friend
router.patch("/friends/reset-unread", protectRoute, resetUnreadCount);

// ✅ GET all friends that have active 1-on-1 conversations
router.get("/friends/conversations", protectRoute, async (req, res) => {
  const userId = req.user.user_id;

  try {
    const result = await pool.query(
      `
      SELECT u.user_id, u.username, c.conversation_id
      FROM friends f
      JOIN users u ON u.user_id = f.friend_id
      JOIN conversation_members cm1 ON cm1.user_id = f.user_id
      JOIN conversation_members cm2 ON cm2.user_id = f.friend_id
      JOIN conversations c ON c.conversation_id = cm1.conversation_id AND cm1.conversation_id = cm2.conversation_id
      WHERE f.user_id = $1 AND f.is_removed = FALSE AND f.is_blocked = FALSE AND c.is_group = FALSE
      GROUP BY u.user_id, c.conversation_id
      `,
      [userId]
    );

    res.json({ friends: result.rows });
  } catch (err) {
    console.error("Fetch friends chat error:", err);
    res.status(500).json({ error: "Failed to load friends with chats" });
  }
});

module.exports = router;
