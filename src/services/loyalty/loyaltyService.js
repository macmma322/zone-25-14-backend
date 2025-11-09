// src/services/points/levelService.js

// src/services/loyalty/loyaltyService.js
const pool = require("../../config/db");
const { isUserSubscribed } = require("../subscriptions/subscriptionService");

const getPointsMultiplier = async (userId) =>
  (await isUserSubscribed(userId)) ? 1.5 : 1;

// NEW: ledger insert
const insertPointsLedger = async (userId, points, meta = {}) => {
  await pool.query(
    `INSERT INTO user_points (user_id, points, earned_at)
     VALUES ($1, $2, NOW())`,
    [userId, points]
  );
};

const updateUserPointsAndRole = async (userId, earnedPoints) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `UPDATE users SET points = points + $1 WHERE user_id = $2 RETURNING points`,
      [earnedPoints, userId]
    );
    const newTotalPoints = rows[0].points;

    const roleRes = await client.query(
      `SELECT role_level_id, role_name
         FROM user_roles_levels
        WHERE required_points <= $1
        ORDER BY required_points DESC
        LIMIT 1`,
      [newTotalPoints]
    );
    const bestRole = roleRes.rows[0];

    const curRoleRes = await client.query(
      `SELECT role_level_id FROM users WHERE user_id = $1`,
      [userId]
    );
    const curRoleId = curRoleRes.rows[0].role_level_id;

    if (bestRole && curRoleId !== bestRole.role_level_id) {
      await client.query(
        `UPDATE users SET role_level_id = $1 WHERE user_id = $2`,
        [bestRole.role_level_id, userId]
      );
      console.log(`✅ User promoted to ${bestRole.role_name}`);
    }

    await client.query("COMMIT");
    return newTotalPoints;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
};

module.exports = {
  getPointsMultiplier,
  insertPointsLedger,
  updateUserPointsAndRole,
};
