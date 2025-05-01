// File: src/routes/users/userPrivacyRoutes.js
const express = require('express');
const router = express.Router();
const { protectRoute } = require('../../middleware/authMiddleware');
const privacyController = require('../../controllers/users/userPrivacyController');

// ✅ GET current privacy settings
router.get('/', protectRoute, privacyController.getPrivacySettings);

// ✅ PATCH to update settings
router.patch('/', protectRoute, privacyController.updatePrivacySettings);

module.exports = router;
