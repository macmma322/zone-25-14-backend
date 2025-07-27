// zone-25-14-backend/src/routes/products/productRoutes.js
// This file defines the routes for product-related operations
// including fetching, creating, updating, and deleting products.
// It uses Express.js for routing and middleware for authentication and authorization.

const express = require("express");
const router = express.Router();
const productController = require("../../controllers/products/productController");
const { adminProtect } = require("../../middleware/adminMiddleware");
const { body } = require("express-validator");

// Public Routes
// ▪️ Fetch all active products
router.get("/products", productController.fetchAllProducts);

// ▪️ Fetch a single product by ID
router.get("/products/:id", productController.fetchProductById);

// Admin Routes
// ▪️ Admin: Create a new product
router.post(
  "/products",
  adminProtect,
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("base_price").isNumeric().withMessage("Base price must be a number"),
    body("currency_code").notEmpty().withMessage("Currency code is required"),
  ],
  productController.createNewProduct
);

// ▪️ Admin: Update an existing product
router.patch(
  "/products/:id",
  adminProtect,
  [
    body("name").optional().notEmpty().withMessage("Name cannot be empty"),
    body("base_price")
      .optional()
      .isNumeric()
      .withMessage("Base price must be a number"),
    body("currency_code")
      .optional()
      .notEmpty()
      .withMessage("Currency code is required"),
  ],
  productController.updateProduct
);

// ▪️ Admin: Soft delete (make inactive) a product
router.patch(
  "/products/:id/soft-delete",
  adminProtect,
  productController.softDeleteProduct
);

// ▪️ Admin: Hard delete (remove permanently) a product
router.delete(
  "/products/:id/hard-delete",
  adminProtect,
  productController.hardDeleteProduct
);

module.exports = router;
