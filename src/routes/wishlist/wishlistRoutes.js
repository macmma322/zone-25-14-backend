//File: src/routes/wishlist/wishlistRoutes.js
const express = require('express');
const router = express.Router();
const wishlistController = require('../../controllers/wishlist/wishlistController');
const { protectRoute } = require('../../middleware/authMiddleware'); // Authenticated users only

// ▪️ Add to Wishlist
router.post('/wishlist', protectRoute, wishlistController.addToWishlist);

// ▪️ Get User's Wishlist
router.get('/wishlist', protectRoute, wishlistController.getWishlist);

// ▪️ Remove from Wishlist
router.delete('/wishlist/:itemId', protectRoute, wishlistController.removeFromWishlist);

module.exports = router;
