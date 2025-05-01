// File: src/routes/products/productRoutes.js
// ▪️ Product Routes
const express = require('express');
const router = express.Router();
const productController = require('../../controllers/products/productController');
const { adminProtect } = require('../../middleware/adminMiddleware');

// Public
router.get('/products', productController.fetchAllProducts);
router.get('/products/:id', productController.fetchProductById);

// Admin
router.post('/products', adminProtect, productController.createNewProduct);
router.patch('/products/:id', adminProtect, productController.updateProduct);
router.patch('/products/:id/soft-delete', adminProtect, productController.softDeleteProduct);
router.delete('/products/:id/hard-delete', adminProtect, productController.hardDeleteProduct);

module.exports = router;
