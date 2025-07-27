// zone-25-14-backend/src/controllers/points/pointsController.js
// This file contains the logic for handling points-related requests
// such as manually adding points to a user.
// It interacts with the loyalty service to update user points and roles.

const {
  updateUserPointsAndRole,
} = require("../../services/loyalty/loyaltyService");

// Temporary endpoint to manually give points to user
const manualAddPoints = async (req, res) => {
  const { userId, earnedPoints } = req.body;

  try {
    // Validation: Ensure that userId and earnedPoints are present
    if (
      !userId ||
      !earnedPoints ||
      typeof earnedPoints !== "number" ||
      earnedPoints <= 0
    ) {
      return res
        .status(400)
        .json({ message: "User ID and valid earnedPoints are required." });
    }

    // Update points and possibly promote role
    await updateUserPointsAndRole(userId, earnedPoints);

    res.status(200).json({
      message: `Successfully added ${earnedPoints} points to user ${userId}`,
      success: true,
    });
  } catch (err) {
    console.error("Manual Points Error:", err.message);
    res.status(500).json({
      message: "Server error",
      success: false,
    });
  }
};

module.exports = {
  manualAddPoints,
};
