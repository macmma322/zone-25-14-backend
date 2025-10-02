// src/models/userModel.js
// Description: User model for handling user-related database operations
// Functions: createUser, findUserByUsername, getUserWithRole
// Dependencies: pg (PostgreSQL client), db configuration, encryption secret
// This file is part of the Zone 25 project, which is licensed under the GNU General Public License v3.0.

const pool = require("../config/db");
const encryptionKey = process.env.ENCRYPTION_SECRET;

// Helper to get default Explorer role_level_id
const getDefaultRoleId = async () => {
  const query = `SELECT role_level_id FROM user_roles_levels WHERE role_name = 'Explorer'`;
  const { rows } = await pool.query(query);
  if (rows.length === 0) {
    throw new Error("Default role Explorer not found");
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
  const values = [
    username,
    password,
    email,
    phone,
    first_name,
    last_name,
    roleLevelId,
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

// Find user by username
const findUserByUsername = async (username) => {
  const encryptionKey = process.env.ENCRYPTION_SECRET;

  const query = `
    SELECT
      user_id,
      username,
      pgp_sym_decrypt(email::bytea, $2) AS email,
      pgp_sym_decrypt(phone::bytea, $2) AS phone,
      password,
      role_level_id,
      first_name,
      last_name,
      biography,
      profile_picture,
      store_credit,
      created_at
    FROM users
    WHERE username = $1
  `;

  const values = [username, encryptionKey];
  const { rows } = await pool.query(query, values);
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

const getUsernameById = async (userId) => {
  const { rows } = await pool.query(
    `SELECT username FROM users WHERE user_id = $1`,
    [userId]
  );
  return rows[0]?.username || "Unknown";
};

module.exports = {
  createUser,
  findUserByUsername,
  getUserWithRole,
  getUsernameById,
};
