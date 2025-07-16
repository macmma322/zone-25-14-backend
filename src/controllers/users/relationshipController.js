// zone-25-14-backend/src/controllers/users/relationshipController.js
// Description: Handles user relationships like friend requests, status, and friend management
// Functions: getRelationshipStatus, sendFriendRequest, cancelFriendRequest,
//            acceptFriendRequest, declineFriendRequest, togglePinnedFriend,
//            resetUnreadCount, updateLastMessageTime, getFriendsList
// Dependencies: Express, PostgreSQL, Redis, Notification Service

const pool = require("../../config/db");
const {
  sendNotification,
  updateNotificationStatusByRequestId,
} = require("../../services/notificationService");
const {
  getDefaultNotificationContent,
  generateAdditionalInfo,
} = require("../../utils/notificationHelpers");
const redis = require("../../config/redis");

// ✅ GET Relationship Status
const getRelationshipStatus = async (req, res) => {
  try {
    const viewerId = req.user.user_id;
    const { username } = req.params;

    const userRes = await pool.query(
      `SELECT user_id FROM users WHERE username = $1`,
      [username]
    );
    if (!userRes.rows.length)
      return res.status(404).json({ error: "User not found" });

    const targetId = userRes.rows[0].user_id;
    if (viewerId === targetId) {
      return res.status(200).json({
        targetId,
        areFriends: false,
        hasPendingFriendRequest: false,
        theySentRequest: false,
        canMessage: false,
      });
    }

    const friendRes = await pool.query(
      `SELECT 1 FROM friends WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1)) AND is_removed = false AND is_blocked = false`,
      [viewerId, targetId]
    );
    const areFriends = friendRes.rows.length > 0;

    const requestRes = await pool.query(
      `SELECT request_id, sender_id, receiver_id FROM friend_requests WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1)) AND status = 'pending' LIMIT 1`,
      [viewerId, targetId]
    );
    const request = requestRes.rows[0];
    const hasPendingFriendRequest = !!request;
    const theySentRequest = request?.sender_id === targetId;
    const requestId = request?.request_id ?? null;

    return res.status(200).json({
      targetId,
      areFriends,
      hasPendingFriendRequest,
      theySentRequest,
      requestId,
      canMessage: areFriends,
    });
  } catch (err) {
    console.error("getRelationshipStatus error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ SEND Friend Request
const sendFriendRequest = async (req, res) => {
  const senderId = req.user.user_id;
  const { username } = req.body;

  try {
    const userRes = await pool.query(
      `SELECT user_id FROM users WHERE username = $1`,
      [username]
    );
    if (!userRes.rows.length)
      return res.status(404).json({ error: "User not found" });

    const receiverId = userRes.rows[0].user_id;
    if (senderId === receiverId)
      return res.status(400).json({ error: "Cannot friend yourself" });

    const friends = await pool.query(
      `SELECT 1 FROM friends WHERE user_id = $1 AND friend_id = $2`,
      [senderId, receiverId]
    );
    if (friends.rows.length > 0)
      return res.status(400).json({ error: "Already friends" });

    const existing = await pool.query(
      `SELECT 1 FROM friend_requests WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'`,
      [senderId, receiverId]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ error: "Request already sent" });

    const insertRes = await pool.query(
      `INSERT INTO friend_requests (sender_id, receiver_id) VALUES ($1, $2) RETURNING request_id`,
      [senderId, receiverId]
    );
    const requestId = insertRes.rows[0].request_id;

    const senderRes = await pool.query(
      `SELECT username FROM users WHERE user_id = $1`,
      [senderId]
    );
    const senderUsername = senderRes.rows[0]?.username ?? "Someone";

    // 🧠 Get mutual friend usernames (limit to 10)
    const mutualFriendsRes = await pool.query(
      `SELECT u.user_id, u.username, u.profile_picture
      FROM friends f1
      JOIN friends f2 ON f1.friend_id = f2.friend_id
      JOIN users u ON u.user_id = f1.friend_id
      WHERE f1.user_id = $1 AND f2.user_id = $2
      LIMIT 10`,
      [senderId, receiverId]
    );

    // 🌐 Extract usernames for preview
    const mutualFriends = mutualFriendsRes.rows; // ⬅️ full objects for rendering avatars + tooltips
    const mutualCount = mutualFriends.length;

    const additional_info = generateAdditionalInfo("friend", {
      nickname: senderUsername,
      senderName: senderUsername,
      mutualFriends,
    });

    await sendNotification(
      receiverId,
      "friend",
      getDefaultNotificationContent("friend", { senderName: senderUsername }),
      `/profile/${senderUsername}`,
      {
        requestId,
        status: "pending",
        senderId, // ✅ ADD THIS LINE
        userId: receiverId,
        nickname: senderUsername,
        mutualCount,
        mutualFriends,
      },
      additional_info
    );

    return res.status(200).json({ message: "Friend request sent" });
  } catch (err) {
    console.error("sendFriendRequest error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ CANCEL Friend Request
const cancelFriendRequest = async (req, res) => {
  const senderId = req.user.user_id;
  const { username } = req.body;

  try {
    const userRes = await pool.query(
      `SELECT user_id FROM users WHERE username = $1`,
      [username]
    );
    if (!userRes.rows.length)
      return res.status(404).json({ error: "User not found" });

    const receiverId = userRes.rows[0].user_id;

    await pool.query(
      `DELETE FROM friend_requests
       WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'`,
      [senderId, receiverId]
    );

    return res.status(200).json({ message: "Request canceled" });
  } catch (err) {
    console.error("cancelFriendRequest error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ ACCEPT Friend Request
const acceptFriendRequest = async (req, res) => {
  const receiverId = req.user.user_id;
  const { requestId } = req.body;

  try {
    console.log("🔍 Accepting friend request:", requestId);

    const reqRes = await pool.query(
      `SELECT sender_id FROM friend_requests
       WHERE request_id = $1 AND receiver_id = $2 AND status = 'pending'`,
      [requestId, receiverId]
    );
    if (!reqRes.rows.length) {
      console.log("⚠️ Friend request not found or already handled.");
      return res.status(404).json({ error: "Request not found" });
    }

    const senderId = reqRes.rows[0].sender_id;

    console.log(
      "👥 Accepting friendship between:",
      senderId,
      "<->",
      receiverId
    );

    await pool.query(
      `UPDATE friend_requests SET status = 'accepted' WHERE request_id = $1`,
      [requestId]
    );

    await updateNotificationStatusByRequestId(requestId, "accepted");

    await pool.query(
      `INSERT INTO friends (user_id, friend_id)
       VALUES ($1, $2), ($2, $1)
       ON CONFLICT DO NOTHING`,
      [senderId, receiverId]
    );

    console.log("✅ Friendship saved to database");

    const receiverRes = await pool.query(
      `SELECT username FROM users WHERE user_id = $1`,
      [receiverId]
    );
    const receiverUsername = receiverRes.rows[0]?.username ?? "Someone";

    await sendNotification(
      receiverId,
      "friend",
      getDefaultNotificationContent("friend", { senderName: senderUsername }),
      `/profile/${senderUsername}`,
      {
        requestId,
        status: "pending",
        nickname: senderUsername,
        senderName: senderUsername,
        mutualFriends,
      },
      additional_info
    );

    return res.status(200).json({ message: "Friend request accepted" });
  } catch (err) {
    console.error("❌ acceptFriendRequest error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ DECLINE Friend Request
const declineFriendRequest = async (req, res) => {
  const receiverId = req.user.user_id;
  const { requestId } = req.body;

  try {
    const reqRes = await pool.query(
      `SELECT sender_id FROM friend_requests
       WHERE request_id = $1 AND receiver_id = $2 AND status = 'pending'`,
      [requestId, receiverId]
    );
    if (!reqRes.rows.length)
      return res.status(404).json({ error: "Request not found" });

    const senderId = reqRes.rows[0].sender_id;

    await pool.query(
      `UPDATE friend_requests SET status = 'declined'
       WHERE request_id = $1 AND receiver_id = $2`,
      [requestId, receiverId]
    );

    await updateNotificationStatusByRequestId(requestId, "declined");

    const receiverRes = await pool.query(
      `SELECT username FROM users WHERE user_id = $1`,
      [receiverId]
    );
    const receiverUsername = receiverRes.rows[0]?.username ?? "Someone";

    await sendNotification(
      senderId,
      "friend",
      `${receiverUsername} declined your friend request.`
    );

    return res.status(200).json({ message: "Friend request declined" });
  } catch (err) {
    console.error("declineFriendRequest error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ TOGGLE PINNED FRIEND
const togglePinnedFriend = async (req, res) => {
  const userId = req.user.user_id;
  const { friendId } = req.body;

  console.log("🔄 Toggle pin called:");
  console.log("User ID:", userId);
  console.log("Friend ID:", friendId);

  try {
    const result = await pool.query(
      `SELECT pinned FROM friends WHERE user_id = $1 AND friend_id = $2`,
      [userId, friendId]
    );

    if (!result.rows.length) {
      console.log("Friend not found between users.");
      return res.status(404).json({ error: "Friend not found" });
    }

    const currentPinned = result.rows[0].pinned;
    const newPinned = !currentPinned;

    console.log("Current pinned:", currentPinned, "→ New:", newPinned);

    await pool.query(
      `UPDATE friends SET pinned = $1 WHERE user_id = $2 AND friend_id = $3`,
      [newPinned, userId, friendId]
    );

    return res.status(200).json({
      message: newPinned ? "Pinned successfully" : "Unpinned successfully",
      pinned: newPinned,
    });
  } catch (err) {
    console.error("togglePinnedFriend error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ RESET UNREAD COUNT
const resetUnreadCount = async (req, res) => {
  const userId = req.user.user_id;
  const { friendId } = req.body;

  try {
    await pool.query(
      `UPDATE friends SET unread_count = 0 WHERE user_id = $1 AND friend_id = $2`,
      [userId, friendId]
    );

    return res.status(200).json({ message: "Unread count reset" });
  } catch (err) {
    console.error("resetUnreadCount error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ INTERNAL HELPER — CALL IN MESSAGE SEND
const updateLastMessageTime = async (userId, friendId) => {
  try {
    await pool.query(
      `UPDATE friends
       SET last_message_time = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND friend_id = $2`,
      [userId, friendId]
    );
  } catch (err) {
    console.error("updateLastMessageTime error:", err);
  }
};

// ✅ GET Friends List
const getFriendsList = async (req, res) => {
  const userId = req.user.user_id;
  const { offset = 0, limit = 20 } = req.query;

  try {
    const result = await pool.query(
      `
      SELECT
        u.user_id AS friend_id,
        u.username,
        u.profile_picture,
        f.pinned,
        f.unread_count,
        f.last_message_time
      FROM friends f
      JOIN users u ON u.user_id = f.friend_id
      WHERE f.user_id = $1 AND f.is_removed = FALSE AND f.is_blocked = FALSE
      ORDER BY f.pinned DESC, f.last_message_time DESC NULLS LAST
      LIMIT $2 OFFSET $3
      `,
      [userId, limit, offset]
    );

    // 🔄 Inject Redis-based presence
    for (let friend of result.rows) {
      const [isOnline, lastSeen] = await Promise.all([
        redis.sismember("online_users", friend.friend_id),
        redis.hget("user_last_seen", friend.friend_id),
      ]);

      friend.is_online = isOnline === 1;
      friend.last_seen = lastSeen;
    }

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("getFriendsList error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ GET mutual friends with another user
const getMutualFriends = async (req, res) => {
  const currentUserId = req.user?.user_id;
  const targetUserId = req.params.userId;

  console.log("🔍 Mutual Friend Request:", { currentUserId, targetUserId });

  try {
    const result = await pool.query(
      `
      SELECT u.user_id, u.username, u.profile_picture
      FROM users u
      WHERE u.user_id IN (
        SELECT f1.friend_id
        FROM friends f1
        JOIN friends f2 ON f1.friend_id = f2.friend_id
        WHERE f1.user_id = $1 AND f2.user_id = $2
      )
      LIMIT 10
      `,
      [currentUserId, targetUserId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("❌ getMutualFriends error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getRelationshipStatus,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  togglePinnedFriend,
  resetUnreadCount,
  updateLastMessageTime,
  getFriendsList,
  getMutualFriends,
};
