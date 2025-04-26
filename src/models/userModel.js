// src/models/userModel.js
const pool = require('../config/db');

// Helper to get default Explorer role_level_id
const getDefaultRoleId = async () => {
    const query = `SELECT role_level_id FROM user_roles_levels WHERE role_name = 'Explorer'`;
    const { rows } = await pool.query(query);
    if (rows.length === 0) {
        throw new Error('Default role Explorer not found');
    }
    return rows[0].role_level_id;
};

// Create a new user
const createUser = async (userData) => {
    const { username, password, email, phone, first_name, last_name } = userData;

    const roleLevelId = await getDefaultRoleId();

    const query = `
    INSERT INTO users (username, password, email, phone, first_name, last_name, role_level_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING user_id, username, created_at;
  `;
    const values = [username, password, email, phone, first_name, last_name, roleLevelId];
    const { rows } = await pool.query(query, values);
    return rows[0];
};

// Find user by username
const findUserByUsername = async (username) => {
    const query = `SELECT * FROM users WHERE username = $1`;
    const { rows } = await pool.query(query, [username]);
    return rows[0];
};

// Get user with their role
const getUserWithRole = async (userId) => {
    const query = `
      SELECT u.user_id, u.username, u.first_name, u.last_name, u.role_level_id, rl.role_name
      FROM users u
      JOIN user_roles_levels rl ON u.role_level_id = rl.role_level_id
      WHERE u.user_id = $1
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows[0];
};

module.exports = {
    createUser,
    findUserByUsername,
    getUserWithRole,
};
