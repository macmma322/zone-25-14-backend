// zone-25-14-backend/src/controllers/points/pointsController.js
// This file contains the logic for handling points-related requests
// such as manually adding points to a user.
// It interacts with the loyalty service to update user points and roles.

// src/controllers/points/pointsController.js
const {
  updateUserPointsAndRole,
  getPointsMultiplier,
  insertPointsLedger,
} = require("../../services/loyalty/loyaltyService");

const manualAddPoints = async (req, res) => {
  const { userId, earnedPoints, applyMultiplier } = req.body;

  try {
    if (!userId || typeof earnedPoints !== "number" || earnedPoints <= 0) {
      return res
        .status(400)
        .json({ message: "User ID and valid earnedPoints are required." });
    }

    let toApply = earnedPoints;
    if (applyMultiplier) {
      const mult = await getPointsMultiplier(userId); // 1 or 1.5
      toApply = Math.floor(earnedPoints * mult); // or keep decimals if you want
    }

    // write to ledger first (optional but recommended)
    await insertPointsLedger(userId, toApply, {
      reason: "manual_add",
      applyMultiplier: !!applyMultiplier,
    });

    // update running total + auto-promote
    const newTotal = await updateUserPointsAndRole(userId, toApply);

    res.status(200).json({
      message: `Added ${toApply} points to user ${userId}${
        applyMultiplier ? " (multiplier applied)" : ""
      }.`,
      newTotalPoints: newTotal,
      success: true,
    });
  } catch (err) {
    console.error("Manual Points Error:", err);
    res.status(500).json({ message: "Server error", success: false });
  }
};

module.exports = { manualAddPoints };
