// File: zone-25-14-backend/src/controllers/auth/authController.js
// Controller for authentication routes: register, login, logout
// Usage: const { register, login, logout } = require('../../controllers/auth/authController');
//        router.post('/register', register);
//        router.post('/login', login);
//        router.post('/logout', logout);
// Note: Ensure to handle errors and edge cases as needed

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { createUser, findUserByUsername } = require("../../models/userModel");
const {
  SESSION_COOKIE_NAME,
  SESSION_SET_OPTIONS,
  SESSION_CLEAR_OPTIONS,
} = require("../../config/cookies");

const register = async (req, res) => {
  try {
    const { username, password, email, phone, first_name, last_name } =
      req.body;

    const existingUser = await findUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await createUser({
      username,
      password: hashedPassword,
      email,
      phone,
      first_name,
      last_name,
    });

    return res.status(201).json({ message: "User created", user });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await findUserByUsername(username);
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const payload = {
      user_id: user.user_id,
      username: user.username,
      role: user.role_level_id,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN, // e.g. "7d"
    });

    return res
      .cookie(SESSION_COOKIE_NAME, token, SESSION_SET_OPTIONS)
      .status(200)
      .json({
        message: "Login successful",
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          first_name: user.first_name,
          last_name: user.last_name,
          biography: user.biography,
          profile_picture: user.profile_picture,
          role_level_id: user.role_level_id,
          store_credit: user.store_credit,
          created_at: user.created_at,
        },
      });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

const logout = (req, res) => {
  // ⚠️ clear with options that match how it was set, but WITHOUT maxAge
  res.clearCookie(SESSION_COOKIE_NAME, SESSION_CLEAR_OPTIONS);
  return res.status(200).json({ message: "Logged out successfully" });
};

module.exports = { register, login, logout };
