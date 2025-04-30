const pool = require("../../config/db");

const checkAndSendBirthdayGift = async (userId) => {
  const today = new Date();
  const thisYear = today.getFullYear();

  const result = await pool.query(
    `SELECT birthday, birthday_reward_year FROM users WHERE user_id = $1`,
    [userId]
  );

  const { birthday, birthday_reward_year } = result.rows[0];

  if (!birthday) return false;

  const birthDate = new Date(birthday);
  const isToday =
    birthDate.getDate() === today.getDate() &&
    birthDate.getMonth() === today.getMonth();

  if (isToday && birthday_reward_year < thisYear) {
    // ✅ Eligible → send gift + update reward year

    // Example: give 500 points
    await pool.query(
      `UPDATE users SET points = points + 500, birthday_reward_year = $1 WHERE user_id = $2`,
      [thisYear, userId]
    );

    // Log or send notification
    console.log(`🎁 Birthday reward sent to user ${userId}`);

    return true;
  }

  return false;
};

module.exports = {
  checkAndSendBirthdayGift,
};
