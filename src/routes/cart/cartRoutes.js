const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/cart/cartController');
const { protectRoute } = require('../../middleware/authMiddleware'); // corrected

// ▪️ Add Item to Cart
router.post('/cart', protectRoute, cartController.addToCart);

// ▪️ Get User's Cart
router.get('/cart', protectRoute, cartController.getCart);

// ▪️ Update Cart Item Quantity
router.patch('/cart/:itemId', protectRoute, cartController.updateCartItem);

// ▪️ Remove Item from Cart
router.delete('/cart/:itemId', protectRoute, cartController.removeCartItem);

module.exports = router;
