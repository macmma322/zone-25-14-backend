// File: src/routes/presenceRoutes.js
const express = require("express");
const router = express.Router();
const presenceService = require("../services/presenceService");

router.get("/", async (req, res) => {
  try {
    const userIds = await presenceService.getOnlineUserIds();
    res.json({ onlineUsers: userIds });
  } catch (err) {
    console.error("❌ Failed to fetch presence:", err);
    res.status(500).json({ error: "Failed to fetch presence" });
  }
});

module.exports = router;
