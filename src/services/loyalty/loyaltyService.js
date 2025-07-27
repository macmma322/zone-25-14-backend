const pool = require("../../config/db");
const { isUserSubscribed } = require("../subscriptions/subscriptionService");

// 📈 Calculate user's point multiplier (1x or 1.5x if subscribed)
const getPointsMultiplier = async (userId) => {
  const subscribed = await isUserSubscribed(userId);
  return subscribed ? 1.5 : 1;
};

// 🚀 Earn points and auto-promote role if needed
const updateUserPointsAndRole = async (userId, earnedPoints) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN"); // Start transaction

    // 1. Validate earned points
    if (typeof earnedPoints !== "number" || earnedPoints <= 0) {
      throw new Error("Invalid points amount.");
    }

    // 2. Update user points
    const updatePointsQuery = `
      UPDATE users
      SET points = points + $1
      WHERE user_id = $2
      RETURNING points;
    `;
    const { rows } = await client.query(updatePointsQuery, [
      earnedPoints,
      userId,
    ]);
    const newTotalPoints = rows[0].points;

    // 3. Find best matching role based on new points
    const roleQuery = `
      SELECT role_level_id, role_name
      FROM user_roles_levels
      WHERE required_points <= $1
      ORDER BY required_points DESC
      LIMIT 1;
    `;
    const roleResult = await client.query(roleQuery, [newTotalPoints]);
    const bestRole = roleResult.rows[0];

    if (!bestRole) {
      throw new Error("No eligible role found.");
    }

    // 4. Check current role
    const currentRoleQuery = `
      SELECT role_level_id
      FROM users
      WHERE user_id = $1;
    `;
    const currentRoleResult = await client.query(currentRoleQuery, [userId]);
    const currentRoleId = currentRoleResult.rows[0].role_level_id;

    // 5. Promote user if necessary
    if (currentRoleId !== bestRole.role_level_id) {
      const promoteQuery = `
        UPDATE users
        SET role_level_id = $1
        WHERE user_id = $2;
      `;
      await client.query(promoteQuery, [bestRole.role_level_id, userId]);
      console.log(`✅ User promoted to ${bestRole.role_name}!`);
    } else {
      console.log("No promotion needed.");
    }

    await client.query("COMMIT"); // Commit transaction
  } catch (err) {
    await client.query("ROLLBACK"); // Rollback transaction if something goes wrong
    console.error("Leveling Error:", err.message);
    throw err; // Propagate error
  } finally {
    client.release(); // Release client back to pool
  }
};

module.exports = {
  updateUserPointsAndRole,
  getPointsMultiplier,
};
