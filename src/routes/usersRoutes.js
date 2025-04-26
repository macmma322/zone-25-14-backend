const express = require('express');
const { getMe } = require('../controllers/usersController');
const { protectRoute } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/me', protectRoute, getMe);

module.exports = router;
