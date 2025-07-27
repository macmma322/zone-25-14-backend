// zone-25-14-backend/src/routes/auth/authRoutes.js
// This file defines the authentication routes for user registration, login, and logout.
// It uses the express router to handle HTTP requests and the authController to handle the business logic.

const express = require("express");
const {
  register,
  login,
  logout,
} = require("../../controllers/auth/authController");
const router = express.Router();

router.post("/register", register); // ✅ Register route
router.post("/login", login); // ✅ Login route
router.post("/logout", logout); // ✅ Logout route

module.exports = router;
