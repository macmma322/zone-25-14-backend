const express = require('express');
const { manualAddPoints } = require('../../controllers/points/pointsController');
const { adminProtect } = require('../../middleware/adminMiddleware');

const router = express.Router();

// Admin-only manual points adding
router.post('/manual-add', adminProtect, manualAddPoints);

module.exports = router;
