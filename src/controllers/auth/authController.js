// File: src/controllers/auth/authController.js
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto"); // ✅ FIXED HERE
const { createUser, findUserByUsername } = require("../../models/userModel");

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

    res.status(201).json({ message: "User created", user });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const payload = {
      userId: user.user_id,
      username: user.username,
      role: user.role_level_id, // Later we can use for role-based protection
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN,
    });

    res.status(200).json({
      message: "Login successful",
      token,
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
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  register,
  login,
};
