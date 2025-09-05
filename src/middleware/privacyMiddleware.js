const { getPrivacyOrDefaults } = require("../models/privacyModel");

// Gate DMs/requests to users who allow messages
const requireMessagingAllowed = () => async (req, res, next) => {
  try {
    const me = req.user.user_id || req.user.userId;
    // infer the target for 1–1 actions
    let target =
      req.body?.toUserId || req.body?.receiverId || req.body?.targetUserId;
    if (
      !target &&
      Array.isArray(req.body?.memberIds) &&
      req.body.memberIds.length === 1
    ) {
      target = req.body.memberIds[0];
    }
    if (!target || target === me) return next(); // groups/self → skip

    const privacy = await getPrivacyOrDefaults(target);
    if (!privacy.allow_messages)
      return res
        .status(403)
        .json({ error: "Recipient is not accepting messages." });
    next();
  } catch (e) {
    console.error("requireMessagingAllowed", e);
    res.status(500).json({ error: "Privacy check failed" });
  }
};

module.exports = { requireMessagingAllowed };
