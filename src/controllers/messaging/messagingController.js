// This file is part of the Zone 25-14 project.
// Licensed under the GNU General Public License v3.0.
// Description: Messaging controller for handling conversations, messages, and members
// Functions: createConversation, addMember, sendMessage, getMessages
// Dependencies: Conversation, ConversationMember, Message models, socket.io, notification service

const { getIO } = require("../../config/socket.js");
const Conversation = require("../../models/conversationModel");
const ConversationMember = require("../../models/conversationMemberModel");
const Message = require("../../models/messageModel");
const pool = require("../../config/db");
const { updateLastMessageTime } = require("../users/relationshipController");
const { getUserWithRole } = require("../../models/userModel");
const { getConversationById } = require("../../models/conversationModel");
const { sendNotification } = require("../../services/notificationService");
const {
  compressImage,
  transcodeVideo,
} = require("../../services/mediaProcessor");

const {
  getDefaultNotificationContent,
  generateAdditionalInfo,
} = require("../../utils/notificationHelpers");

// ✅ MARK Conversation as Read
const markConversationRead = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { id } = req.params;

    await pool.query(
      `UPDATE public.conversation_members
       SET last_read_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2`,
      [id, userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("markConversationRead error:", err);
    res.status(500).json({ error: "Failed to mark read" });
  }
};

// ✅ CREATE Conversation
const createConversation = async (req, res) => {
  try {
    const { isGroup, groupName, groupAvatar, memberIds = [] } = req.body; // ← groupAvatar
    const user_id = req.user.user_id;

    // Reuse existing 1:1 reuse logic
    if (!isGroup && memberIds.length === 1) {
      const existing = await pool.query(
        `SELECT c.conversation_id
         FROM conversations c
         JOIN conversation_members cm1 ON cm1.conversation_id = c.conversation_id
         JOIN conversation_members cm2 ON cm2.conversation_id = c.conversation_id
         WHERE c.is_group = false
           AND cm1.user_id = $1 AND cm2.user_id = $2
         LIMIT 1`,
        [user_id, memberIds[0]]
      );
      if (existing.rows.length) {
        return res.status(200).json({
          conversation: { conversation_id: existing.rows[0].conversation_id },
          existing: true,
        });
      }
    }

    // create base conversation
    const convo = await Conversation.createConversation(
      isGroup,
      isGroup ? groupName : null,
      user_id
    );

    // (NEW) optional avatar
    if (isGroup && groupAvatar) {
      await pool.query(
        `UPDATE conversations SET group_avatar = $1 WHERE conversation_id = $2`,
        [groupAvatar, convo.conversation_id]
      );
      convo.group_avatar = groupAvatar;
    }

    // add creator
    await ConversationMember.addMemberToConversation(
      convo.conversation_id,
      user_id,
      "owner"
    );

    // add invited members
    const uniqueMembers = Array.from(
      new Set(memberIds.filter((id) => id && id !== user_id))
    );

    for (const id of uniqueMembers) {
      await ConversationMember.addMemberToConversation(
        convo.conversation_id,
        id
      );
    }

    // (NEW) realtime + notifications for invitees
    try {
      const { rows: creatorRow } = await pool.query(
        `SELECT username FROM users WHERE user_id = $1`,
        [user_id]
      );
      const creatorName = creatorRow[0]?.username || "Someone";

      // Socket emit to each invited user so their sidebar refreshes instantly
      const { getSocketIdByUserId, getIO } = require("../../config/socket");
      const io = getIO();

      for (const memberId of uniqueMembers) {
        const sid = await getSocketIdByUserId(memberId);
        if (sid) {
          io.to(sid).emit("groupCreated", {
            conversation_id: convo.conversation_id,
            is_group: true,
            group_name: convo.group_name,
            group_avatar: convo.group_avatar || null,
            created_by: user_id,
          });
        }

        // Optional: send a “you were added” notification
        const content = groupName
          ? `${creatorName} added you to ${groupName}`
          : `${creatorName} added you to a group chat`;
        await sendNotification(
          memberId,
          "message", // reuse "message" type, or add a "group" type if you prefer
          content,
          `/chat/${convo.conversation_id}`,
          { kind: "group_invite" },
          null
        );
      }
    } catch (e) {
      // non-fatal
      console.warn("createConversation notify error:", e.message);
    }

    return res.status(201).json({ conversation: convo });
  } catch (err) {
    console.error("createConversation error:", err);
    return res.status(500).json({ error: "Failed to create conversation" });
  }
};

// ✅ LIST Conversations
const listConversations = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const { rows } = await pool.query(
      `
      SELECT
        c.conversation_id,
        c.is_group,
        c.group_name,
        c.group_avatar,              -- ← add this

        lm.message_id    AS last_message_id,
        lm.content       AS last_message_text,
        lm.sent_at       AS last_message_time,
        lm.media_type    AS last_message_media_type,

        other_user.user_id        AS other_user_id,
        other_user.username       AS other_username,
        other_user.profile_picture AS other_avatar,

        COALESCE((
          SELECT COUNT(*)
          FROM public.messages m
          WHERE m.conversation_id = c.conversation_id
            AND m.is_deleted = false
            AND m.sent_at > COALESCE(cm.last_read_at, 'epoch'::timestamptz)
            AND m.sender_id <> $1
        ), 0) AS unread_count

      FROM public.conversations c
      JOIN public.conversation_members cm
        ON cm.conversation_id = c.conversation_id
       AND cm.user_id = $1

      LEFT JOIN LATERAL (
        SELECT m.*
        FROM public.messages m
        WHERE m.conversation_id = c.conversation_id
          AND m.is_deleted = false
        ORDER BY m.sent_at DESC
        LIMIT 1
      ) lm ON true

      LEFT JOIN LATERAL (
        SELECT u.user_id, u.username, u.profile_picture
        FROM public.conversation_members cmx
        JOIN public.users u ON u.user_id = cmx.user_id
        WHERE cmx.conversation_id = c.conversation_id
          AND cmx.user_id <> $1
        LIMIT 1
      ) other_user ON true

      ORDER BY COALESCE(lm.sent_at, c.created_at) DESC NULLS LAST
      `,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("listConversations error:", err);
    res.status(500).json({ error: "Failed to load conversations" });
  }
};

// ✅ ADD Member to Conversation
const addMember = async (req, res) => {
  try {
    const { conversationId, newMemberId } = req.body;
    const user_id = req.user.user_id;

    const members = await ConversationMember.getConversationMembers(
      conversationId
    );
    const caller = members.find((m) => m.user_id === user_id);

    if (!caller || !["owner", "admin"].includes(caller.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    await ConversationMember.addMemberToConversation(
      conversationId,
      newMemberId
    );

    const convo = await getConversationById(conversationId);
    const senderInfo = await getUserWithRole(user_id);
    const senderName = senderInfo?.username || "Someone";

    await sendNotification(
      newMemberId,
      "message",
      getDefaultNotificationContent("message", {
        senderName,
        eventName: convo?.group_name || "a group chat",
      }),
      `/chat/${conversationId}`
    );

    return res.status(200).json({ message: "Member added and notified." });
  } catch (err) {
    console.error("addMember error:", err);
    return res.status(500).json({ error: "Failed to add member" });
  }
};

// ✅ SEND Message
const sendMessage = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { conversationId, content, replyToMessageId, media_url, media_type } =
      req.body;

    // (NEW) reject truly-empty messages
    const trimmed = (content || "").trim();
    if (!trimmed && !media_url) {
      return res
        .status(400)
        .json({ error: "Message must include text or media." });
    }

    // Save message
    const urlToSaveToDb = media_url || null;
    const message = await Message.sendMessage(
      conversationId,
      user_id,
      trimmed,
      replyToMessageId || null,
      urlToSaveToDb,
      media_type || null
    );

    // sender profile
    const senderRes = await pool.query(
      `SELECT username, profile_picture FROM users WHERE user_id = $1`,
      [user_id]
    );
    const username = senderRes.rows[0]?.username || "Unknown";
    const avatar = senderRes.rows[0]?.profile_picture || null;

    // conversation meta (for notification phrasing)
    const convMeta = await pool.query(
      `SELECT is_group, group_name FROM conversations WHERE conversation_id = $1`,
      [conversationId]
    );
    const isGroup = !!convMeta.rows[0]?.is_group;
    const groupName = convMeta.rows[0]?.group_name || null;

    // reply payload (unchanged)
    let replyToMessage = null;
    if (replyToMessageId) {
      const replyRes = await pool.query(
        `SELECT message_id, content, sender_id FROM messages WHERE message_id = $1`,
        [replyToMessageId]
      );
      if (replyRes.rows.length > 0) {
        const replyUserRes = await pool.query(
          `SELECT username FROM users WHERE user_id = $1`,
          [replyRes.rows[0].sender_id]
        );
        replyToMessage = {
          message_id: replyRes.rows[0].message_id,
          content: replyRes.rows[0].content,
          username: replyUserRes.rows[0]?.username || "Unknown",
        };
      }
    }

    // members
    const memberRes = await pool.query(
      `SELECT user_id FROM conversation_members WHERE conversation_id = $1`,
      [conversationId]
    );

    // keep friend "lastMessageTime" for 1:1s
    if (memberRes.rows.length === 2) {
      const friendId = memberRes.rows.find(
        (m) => m.user_id !== user_id
      )?.user_id;
      if (friendId) {
        await updateLastMessageTime(user_id, friendId);
        await updateLastMessageTime(friendId, user_id);
      }
    }

    // full payload to room
    const fullMessage = {
      message_id: message.message_id,
      conversation_id: conversationId,
      sender_id: user_id,
      username,
      avatar,
      content: message.content,
      sent_at: message.sent_at,
      media_url: message.media_url,
      media_type: message.media_type,
      reply_to_message: replyToMessage || undefined,
    };

    const io = getIO();
    io.to(conversationId).emit("receiveMessage", fullMessage);

    // notify offline members with context (group name)
    const room = io.sockets.adapter.rooms.get(conversationId);
    const socketsInRoom = room ? Array.from(room) : [];
    const { getSocketIdByUserId } = require("../../config/socket");

    for (const member of memberRes.rows) {
      const targetId = member.user_id;
      if (targetId === user_id) continue;

      const targetSocketId = await getSocketIdByUserId(targetId);
      const isViewingRoom =
        targetSocketId && socketsInRoom.includes(targetSocketId);

      if (!isViewingRoom) {
        const preview =
          trimmed.length > 40 ? trimmed.slice(0, 40) + "..." : trimmed;
        const additional_info = generateAdditionalInfo(
          replyToMessageId ? "reply" : "message",
          { preview }
        );

        // 👇 pass eventName for groups so content becomes "macmma322 sent a message to The Cartel"
        await sendNotification(
          targetId,
          replyToMessageId ? "reply" : "message",
          getDefaultNotificationContent(
            replyToMessageId ? "reply" : "message",
            {
              senderName: username,
              eventName: isGroup ? groupName : undefined,
            }
          ),
          `/chat/${conversationId}`,
          { isGroup, groupName },
          additional_info
        );
      }
    }

    return res.status(201).json({ message: fullMessage });
  } catch (err) {
    console.error("Send message error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ✅ GET Messages
const getMessages = async (req, res) => {
  const { conversationId, before, limit = 30 } = req.query;

  if (!conversationId) {
    return res.status(400).json({ error: "Missing conversationId" });
  }

  try {
    const values = [conversationId];
    let query = `
      SELECT
        m.message_id,
        m.sender_id,
        u.username,
        u.profile_picture AS sender_avatar,
        m.content,
        m.sent_at,
        m.reply_to_id,
        m.media_url,
        m.media_type,
        r.content AS reply_to_content,
        ru.username AS reply_to_username
      FROM messages m
      JOIN users u ON u.user_id = m.sender_id
      LEFT JOIN messages r ON m.reply_to_id = r.message_id
      LEFT JOIN users ru ON r.sender_id = ru.user_id
      WHERE m.conversation_id = $1 AND m.is_deleted = false
    `;

    if (before) {
      query += ` AND m.sent_at < (SELECT sent_at FROM messages WHERE message_id = $2)`;
      values.push(before);
    }

    query += ` ORDER BY m.sent_at DESC LIMIT $${values.length + 1}`;
    values.push(limit);

    const messagesResult = await pool.query(query, values);
    const messages = messagesResult.rows;

    const messageIds = messages.map((msg) => msg.message_id);
    let reactionsMap = new Map();

    if (messageIds.length > 0) {
      const reactionQuery = `
        SELECT
          mr.reaction_id,
          mr.message_id,
          mr.user_id,
          u.username,
          u.profile_picture AS avatar,
          mr.reaction,
          mr.reacted_at
        FROM message_reactions mr
        JOIN users u ON u.user_id = mr.user_id
        WHERE mr.message_id = ANY($1)
      `;
      const reactionResult = await pool.query(reactionQuery, [messageIds]);

      reactionResult.rows.forEach((reaction) => {
        if (!reactionsMap.has(reaction.message_id)) {
          reactionsMap.set(reaction.message_id, []);
        }
        reactionsMap.get(reaction.message_id).push({
          reaction_id: reaction.reaction_id,
          user_id: reaction.user_id,
          username: reaction.username,
          avatar: reaction.avatar, // <--- ADD THIS LINE to include the avatar
          message_id: reaction.message_id,
          reaction: reaction.reaction,
          reacted_at: reaction.reacted_at,
        });
      });
    }

    const formattedMessages = messages.map((msg) => ({
      message_id: msg.message_id,
      sender_id: msg.sender_id,
      username: msg.username,
      avatar: msg.sender_avatar || null,
      content: msg.content,
      sent_at: msg.sent_at,
      reply_to_id: msg.reply_to_id,
      reply_to_message: msg.reply_to_id
        ? {
            message_id: msg.reply_to_id,
            username: msg.reply_to_username,
            content: msg.reply_to_content,
          }
        : undefined,
      media_url: msg.media_url,
      media_type: msg.media_type,
      reactions: reactionsMap.get(msg.message_id) || [],
    }));

    const hasMore = messages.length === parseInt(limit);
    res.json({ messages: formattedMessages, hasMore });
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /conversations/:id
const getConversation = async (req, res) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  const q = `
    SELECT c.conversation_id, c.is_group, c.group_name, c.group_avatar
    FROM conversations c
    JOIN conversation_members cm ON cm.conversation_id = c.conversation_id AND cm.user_id = $1
    WHERE c.conversation_id = $2
    LIMIT 1`;
  const { rows } = await pool.query(q, [userId, id]);
  if (!rows.length) return res.status(404).json({ error: "Not found" });
  res.json(rows[0]);
};

// GET /conversations/:id/members
const listMembers = async (req, res) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  // ensure membership
  const ok = await pool.query(
    `SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2`,
    [id, userId]
  );
  if (!ok.rows.length) return res.status(403).json({ error: "Forbidden" });

  const { rows } = await pool.query(
    `SELECT cm.user_id, cm.role, u.username, u.profile_picture AS avatar
     FROM conversation_members cm
     JOIN users u ON u.user_id = cm.user_id
     WHERE cm.conversation_id = $1
     ORDER BY CASE cm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'moderator' THEN 2 ELSE 3 END, u.username`,
    [id]
  );
  res.json(rows);
};

// POST /conversations/:id/invite  { memberIds: string[] }
const inviteMembers = async (req, res) => {
  const actorId = req.user.user_id;
  const { id } = req.params;
  const { memberIds = [] } = req.body;

  // perms: owner/admin can invite
  const { rows: meRows } = await pool.query(
    `SELECT role FROM conversation_members WHERE conversation_id=$1 AND user_id=$2`,
    [id, actorId]
  );
  if (!meRows.length || !["owner", "admin"].includes(meRows[0].role))
    return res.status(403).json({ error: "Insufficient permissions" });

  const unique = Array.from(new Set(memberIds)).filter(Boolean);
  for (const uid of unique) {
    const exists = await pool.query(
      `SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2`,
      [id, uid]
    );
    if (!exists.rows.length) {
      await ConversationMember.addMemberToConversation(id, uid);
    }
  }

  // realtime: roster changed
  const io = getIO();
  io.to(id).emit("membersUpdated", { conversation_id: id });

  // notify new members
  const { rows: conv } = await pool.query(
    `SELECT group_name, is_group FROM conversations WHERE conversation_id=$1`,
    [id]
  );
  const { rows: who } = await pool.query(
    `SELECT username FROM users WHERE user_id=$1`,
    [actorId]
  );
  const actorName = who[0]?.username || "Someone";

  for (const uid of unique) {
    await sendNotification(
      uid,
      "message",
      conv[0].is_group
        ? `${actorName} added you to ${conv[0].group_name || "a group chat"}`
        : `${actorName} started a chat with you`,
      `/chat/${id}`,
      { kind: "group_invite" }
    );
  }

  return res.json({ ok: true });
};

// POST /conversations/:id/leave
const leaveConversation = async (req, res) => {
  const userId = req.user.user_id;
  const { id } = req.params;

  const { rows: mine } = await pool.query(
    `SELECT role FROM conversation_members WHERE conversation_id=$1 AND user_id=$2`,
    [id, userId]
  );
  if (!mine.length) return res.status(404).json({ error: "Not a member" });

  // owner must transfer before leaving
  if (mine[0].role === "owner") {
    return res
      .status(400)
      .json({ error: "Owner must transfer ownership before leaving." });
  }

  await pool.query(
    `DELETE FROM conversation_members WHERE conversation_id=$1 AND user_id=$2`,
    [id, userId]
  );

  getIO().to(id).emit("memberLeft", { conversation_id: id, user_id: userId });

  return res.json({ ok: true });
};

// POST /conversations/:id/remove-member  { memberId }
const removeMember = async (req, res) => {
  const actorId = req.user.user_id;
  const { id } = req.params;
  const { memberId } = req.body;

  const { rows: roles } = await pool.query(
    `SELECT user_id, role FROM conversation_members WHERE conversation_id=$1 AND user_id IN ($2,$3)`,
    [id, actorId, memberId]
  );
  const me = roles.find((r) => r.user_id === actorId);
  const target = roles.find((r) => r.user_id === memberId);
  if (!me) return res.status(403).json({ error: "Forbidden" });
  if (!target)
    return res.status(404).json({ error: "Target not in conversation" });

  const canKick =
    me.role === "owner" ||
    (me.role === "admin" && !["owner", "admin"].includes(target.role));
  if (!canKick)
    return res.status(403).json({ error: "Insufficient permissions" });

  await pool.query(
    `DELETE FROM conversation_members WHERE conversation_id=$1 AND user_id=$2`,
    [id, memberId]
  );
  getIO()
    .to(id)
    .emit("memberRemoved", { conversation_id: id, user_id: memberId });

  return res.json({ ok: true });
};

// POST /conversations/:id/role  { memberId, role } // role: 'admin'|'moderator'|'member'
const changeMemberRole = async (req, res) => {
  const actorId = req.user.user_id;
  const { id } = req.params;
  const { memberId, role } = req.body;

  if (!["admin", "moderator", "member"].includes(role))
    return res.status(400).json({ error: "Invalid role" });

  const { rows: me } = await pool.query(
    `SELECT role FROM conversation_members WHERE conversation_id=$1 AND user_id=$2`,
    [id, actorId]
  );
  if (!me.length || me[0].role !== "owner")
    return res.status(403).json({ error: "Only owner can change roles" });

  await pool.query(
    `UPDATE conversation_members SET role=$1 WHERE conversation_id=$2 AND user_id=$3`,
    [role, id, memberId]
  );

  getIO()
    .to(id)
    .emit("roleChanged", { conversation_id: id, user_id: memberId, role });
  res.json({ ok: true });
};

// POST /conversations/:id/transfer-ownership  { newOwnerId }
const transferOwnership = async (req, res) => {
  const actorId = req.user.user_id;
  const { id } = req.params;
  const { newOwnerId } = req.body;

  const { rows: me } = await pool.query(
    `SELECT role FROM conversation_members WHERE conversation_id=$1 AND user_id=$2`,
    [id, actorId]
  );
  if (!me.length || me[0].role !== "owner")
    return res.status(403).json({ error: "Only owner can transfer ownership" });

  // new owner must be a member
  const ok = await pool.query(
    `SELECT 1 FROM conversation_members WHERE conversation_id=$1 AND user_id=$2`,
    [id, newOwnerId]
  );
  if (!ok.rows.length)
    return res.status(400).json({ error: "User not in conversation" });

  await pool.query(
    `UPDATE conversation_members SET role='admin' WHERE conversation_id=$1 AND user_id=$2`,
    [id, actorId]
  );
  await pool.query(
    `UPDATE conversation_members SET role='owner' WHERE conversation_id=$1 AND user_id=$2`,
    [id, newOwnerId]
  );

  getIO().to(id).emit("roleChanged", {
    conversation_id: id,
    user_id: newOwnerId,
    role: "owner",
  });
  res.json({ ok: true });
};

// PATCH /conversations/:id  { groupName?, groupAvatar? }
const updateConversation = async (req, res) => {
  const actorId = req.user.user_id;
  const { id } = req.params;
  const { groupName, groupAvatar } = req.body;

  const { rows: me } = await pool.query(
    `SELECT role FROM conversation_members WHERE conversation_id=$1 AND user_id=$2`,
    [id, actorId]
  );
  if (!me.length || !["owner", "admin", "moderator"].includes(me[0].role))
    return res.status(403).json({ error: "Insufficient permissions" });

  const fields = [];
  const vals = [];
  let i = 1;
  if (typeof groupName === "string") {
    fields.push(`group_name=$${i++}`);
    vals.push(groupName);
  }
  if (typeof groupAvatar === "string") {
    fields.push(`group_avatar=$${i++}`);
    vals.push(groupAvatar);
  }
  if (!fields.length) return res.json({ ok: true });

  vals.push(id);
  await pool.query(
    `UPDATE conversations SET ${fields.join(", ")} WHERE conversation_id=$${i}`,
    vals
  );

  getIO().to(id).emit("conversationUpdated", {
    conversation_id: id,
    groupName,
    groupAvatar,
  });
  res.json({ ok: true });
};

// POST /conversations/:id/mute  { until?: string | null }
const muteConversation = async (req, res) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  const { until } = req.body; // ISO string | null

  await pool.query(
    `UPDATE conversation_members SET muted_until = $1 WHERE conversation_id=$2 AND user_id=$3`,
    [until ? new Date(until) : null, id, userId]
  );
  res.json({ ok: true });
};

// POST /conversations/:id/pin  { pinned: boolean }
const pinConversation = async (req, res) => {
  const userId = req.user.user_id;
  const { id } = req.params;
  const { pinned } = req.body;

  await pool.query(
    `UPDATE conversation_members SET pinned = $1 WHERE conversation_id=$2 AND user_id=$3`,
    [!!pinned, id, userId]
  );
  res.json({ ok: true });
};

// DELETE /conversations/:id
const deleteConversation = async (req, res) => {
  const actorId = req.user.user_id;
  const { id } = req.params;

  const { rows: me } = await pool.query(
    `SELECT role FROM conversation_members WHERE conversation_id=$1 AND user_id=$2`,
    [id, actorId]
  );
  if (!me.length || me[0].role !== "owner")
    return res
      .status(403)
      .json({ error: "Only owner can delete the conversation" });

  await pool.query(
    `DELETE FROM conversation_members WHERE conversation_id=$1`,
    [id]
  );
  await pool.query(`DELETE FROM conversations WHERE conversation_id=$1`, [id]);

  getIO().to(id).emit("conversationDeleted", { conversation_id: id });
  res.json({ ok: true });
};

module.exports = {
  createConversation,
  addMember,
  sendMessage,
  getMessages,
  listConversations,
  markConversationRead,
  getConversation,
  listMembers,
  inviteMembers,
  leaveConversation,
  removeMember,
  changeMemberRole,
  transferOwnership,
  updateConversation,
  muteConversation,
  pinConversation,
  deleteConversation,
};
