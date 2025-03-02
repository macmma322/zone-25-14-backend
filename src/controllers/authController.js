const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");



const authController = {
  async register(req, res) {
    const { username, email, password, roleId } = req.body;
    try {
      const existingUser = await User.findUserByEmail(email);
      if (existingUser)
        return res.status(400).json({ error: "Email already in use" });

      const newUser = await User.createUser(username, email, password, roleId);
      res
        .status(201)
        .json({ message: "User registered successfully", user: newUser });
    } catch (error) {
      res.status(500).json({ error: "Registration failed" });
    }
  },

  async login(req, res) {
    const { email, password } = req.body;
    try {
      const user = await User.findUserByEmail(email);
      if (!user)
        return res.status(400).json({ error: "Invalid email or password" });

      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch)
        return res.status(400).json({ error: "Invalid email or password" });

      const token = jwt.sign(
        { userId: user.user_id, roleId: user.role_id },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );
      res.status(200).json({ message: "Login successful", token });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  },
  
};

module.exports = authController;
