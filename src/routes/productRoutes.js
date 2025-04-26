const express = require('express');
const {
    fetchAllProducts,
    fetchProductById,
    createNewProduct,
} = require('../controllers/productController');
const { adminProtect } = require('../middleware/adminMiddleware');

const router = express.Router();



// Public
router.get('/', fetchAllProducts);
router.get('/:id', fetchProductById);

// Admin
router.post('/', adminProtect, createNewProduct);

module.exports = router;
