const express = require("express");
const { register, login, logout } = require("../../controllers/auth/authController");
const router = express.Router();

router.post("/register", register); // ✅ Register route
router.post("/login", login);       // ✅ Login route
router.post("/logout", logout);     // ✅ Logout route 

module.exports = router;
