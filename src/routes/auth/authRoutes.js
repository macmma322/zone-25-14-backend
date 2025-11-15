// zone-25-14-backend/src/routes/auth/authRoutes.js
// This file defines the authentication routes for user registration, login, and logout.
// It uses the express router to handle HTTP requests and the authController to handle the business logic.

const express = require("express");
const {
  register,
  login,
  logout,
} = require("../../controllers/auth/authController");
const { protectRoute } = require("../../middleware/authMiddleware");
const pool = require("../../config/db");
const router = express.Router();

router.post("/register", register); // ✅ Register route
router.post("/login", login); // ✅ Login route
router.post("/logout", logout); // ✅ Logout route

// ✅ NEW: Get current user with role information
router.get("/me", protectRoute, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT 
        u.user_id, 
        u.username, 
        u.email, 
        u.display_name,
        u.profile_picture,
        rl.role_name as role, 
        rl.is_staff
       FROM users u
       JOIN user_roles_levels rl ON u.role_level_id = rl.role_level_id
       WHERE u.user_id = $1`,
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
