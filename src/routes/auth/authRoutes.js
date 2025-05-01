//F:\zone-25-14\zone-25-14-backend\src\routes\auth\authRoutes.js
const express = require('express');
const { register, login } = require('../../controllers/auth/authController');
const router = express.Router();

router.post('/register', register);
router.post('/login', login); // <-- ✅ New route for login

module.exports = router;
