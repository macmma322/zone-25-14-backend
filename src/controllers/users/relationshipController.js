const pool = require("../../config/db");

// ✅ GET Relationship Status
const getRelationshipStatus = async (req, res) => {
  try {
    const viewerId = req.user.user_id;
    const { username } = req.params;

    const userRes = await pool.query(
      `SELECT user_id FROM users WHERE username = $1`,
      [username]
    );
    if (!userRes.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

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
      `SELECT 1 FROM friends
       WHERE ((user_id = $1 AND friend_id = $2) OR (user_id = $2 AND friend_id = $1))
         AND is_removed = false AND is_blocked = false`,
      [viewerId, targetId]
    );
    const areFriends = friendRes.rows.length > 0;

    const requestRes = await pool.query(
      `SELECT request_id, sender_id, receiver_id
       FROM friend_requests
       WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
         AND status = 'pending'
       LIMIT 1`,
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
      `SELECT 1 FROM friend_requests
       WHERE sender_id = $1 AND receiver_id = $2 AND status = 'pending'`,
      [senderId, receiverId]
    );
    if (existing.rows.length > 0)
      return res.status(400).json({ error: "Request already sent" });

    await pool.query(
      `INSERT INTO friend_requests (sender_id, receiver_id)
       VALUES ($1, $2)`,
      [senderId, receiverId]
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
    const reqRes = await pool.query(
      `SELECT sender_id FROM friend_requests
       WHERE request_id = $1 AND receiver_id = $2 AND status = 'pending'`,
      [requestId, receiverId]
    );
    if (!reqRes.rows.length)
      return res.status(404).json({ error: "Request not found" });

    const senderId = reqRes.rows[0].sender_id;

    await pool.query(
      `UPDATE friend_requests SET status = 'accepted' WHERE request_id = $1`,
      [requestId]
    );

    await pool.query(
      `INSERT INTO friends (user_id, friend_id)
       VALUES ($1, $2), ($2, $1)`,
      [senderId, receiverId]
    );

    return res.status(200).json({ message: "Friend request accepted" });
  } catch (err) {
    console.error("acceptFriendRequest error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ DECLINE Friend Request
const declineFriendRequest = async (req, res) => {
  const receiverId = req.user.user_id;
  const { requestId } = req.body;

  try {
    await pool.query(
      `UPDATE friend_requests SET status = 'declined'
       WHERE request_id = $1 AND receiver_id = $2`,
      [requestId, receiverId]
    );

    return res.status(200).json({ message: "Friend request declined" });
  } catch (err) {
    console.error("declineFriendRequest error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getRelationshipStatus,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
};
