const pool = require('../config/db');

// Earn points and auto-promote role if needed
const updateUserPointsAndRole = async (userId, earnedPoints) => {
  try {
    // 1. Update user points
    const updatePointsQuery = `
      UPDATE users
      SET points = points + $1
      WHERE user_id = $2
      RETURNING points;
    `;
    const { rows } = await pool.query(updatePointsQuery, [earnedPoints, userId]);
    const newTotalPoints = rows[0].points;

    // 2. Find best matching role based on new points
    const roleQuery = `
      SELECT role_level_id, role_name
      FROM user_roles_levels
      WHERE required_points <= $1
      ORDER BY required_points DESC
      LIMIT 1;
    `;
    const roleResult = await pool.query(roleQuery, [newTotalPoints]);
    const bestRole = roleResult.rows[0];

    if (!bestRole) {
      console.log('No eligible role found.');
      return;
    }

    // 3. Check if user already has the role
    const currentRoleQuery = `
      SELECT role_level_id
      FROM users
      WHERE user_id = $1
    `;
    const currentRoleResult = await pool.query(currentRoleQuery, [userId]);
    const currentRoleId = currentRoleResult.rows[0].role_level_id;

    if (currentRoleId !== bestRole.role_level_id) {
      // 4. Promote user
      const promoteQuery = `
        UPDATE users
        SET role_level_id = $1
        WHERE user_id = $2;
      `;
      await pool.query(promoteQuery, [bestRole.role_level_id, userId]);
      console.log(`✅ User promoted to ${bestRole.role_name}!`);
    } else {
      console.log('No promotion needed.');
    }

  } catch (err) {
    console.error('Leveling Error:', err.message);
  }
};

module.exports = {
  updateUserPointsAndRole,
};
