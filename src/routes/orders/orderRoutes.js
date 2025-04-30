const express = require('express');
const { protectRoute } = require('../../middleware/authMiddleware');
const { placeOrder } = require('../../controllers/orders/orderController');

const router = express.Router();

// User places order
router.post('/', protectRoute, placeOrder);

module.exports = router;
