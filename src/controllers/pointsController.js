const { updateUserPointsAndRole } = require('../services/loyaltyService');

// Temporary endpoint to manually give points to user
const manualAddPoints = async (req, res) => {
  try {
    const { userId, earnedPoints } = req.body;

    if (!userId || !earnedPoints) {
      return res.status(400).json({ message: 'User ID and earnedPoints are required.' });
    }

    await updateUserPointsAndRole(userId, earnedPoints);

    res.status(200).json({ message: `Successfully added ${earnedPoints} points to user ${userId}` });
  } catch (err) {
    console.error('Manual Points Error:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  manualAddPoints,
};
