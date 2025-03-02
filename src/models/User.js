const pool = require("../config/db");
const bcrypt = require("bcrypt");

const User = {
  async createUser(username, email, password, roleId = 2) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (username, email, password_hash, role_id) VALUES ($1, $2, $3, $4) RETURNING *",
      [username, email, hashedPassword, roleId]
    );
    return result.rows[0];
  },

  async findUserByEmail(email) {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [
      email,
    ]);
    return result.rows[0];
  },

  async findUserById(userId) {
    const result = await pool.query("SELECT * FROM users WHERE user_id = $1", [
      userId,
    ]);
    return result.rows[0];
  },

  async updateProfile(userId, bio, avatarUrl) {
    const result = await pool.query(
      "UPDATE users SET bio = $1, avatar_url = $2 WHERE user_id = $3 RETURNING *",
      [bio, avatarUrl, userId]
    );
    return result.rows[0];
  },

  async updateLastLogin(userId) {
    await pool.query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = $1",
      [userId]
    );
  },

  async verifyEmail(userId) {
    await pool.query(
      "UPDATE users SET email_verified = TRUE WHERE user_id = $1",
      [userId]
    );
  },
};

module.exports = User;
