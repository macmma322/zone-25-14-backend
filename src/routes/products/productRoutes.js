// src/routes/products/productRoutes.js
// Enhanced product routes with role-based access control
const express = require("express");
const router = express.Router();
const productController = require("../../controllers/products/productController");
const { protectRoute } = require("../../middleware/authMiddleware");
const {
  adminProtect,
  superAdminProtect,
  requireAnyRole,
} = require("../../middleware/adminMiddleware");
const { body, query } = require("express-validator");

/* ==================== VALIDATION RULES ==================== */

const productValidation = [
  body("name")
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ min: 3, max: 200 })
    .withMessage("Name must be 3-200 characters"),
  body("description")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Description max 2000 characters"),
  body("base_price")
    .notEmpty()
    .withMessage("Base price is required")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("currency_code")
    .optional()
    .isIn(["USD", "EUR", "GBP", "BGN"])
    .withMessage("Invalid currency code"),
  body("brand_id").optional().isUUID().withMessage("Invalid brand ID"),
  body("images").optional().isArray().withMessage("Images must be an array"),
  body("variations")
    .optional()
    .isArray()
    .withMessage("Variations must be an array"),
  body("category_ids")
    .optional()
    .isArray()
    .withMessage("Category IDs must be an array"),
];

const updateProductValidation = [
  body("name")
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage("Name must be 3-200 characters"),
  body("description")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Description max 2000 characters"),
  body("base_price")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Price must be positive"),
  body("currency_code")
    .optional()
    .isIn(["USD", "EUR", "GBP", "BGN"])
    .withMessage("Invalid currency code"),
];

const stockValidation = [
  body("quantity")
    .notEmpty()
    .withMessage("Quantity is required")
    .isInt()
    .withMessage("Quantity must be an integer"),
];

const categoryValidation = [
  body("category_name")
    .notEmpty()
    .withMessage("Category name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be 2-100 characters"),
];

/* ==================== PUBLIC ROUTES ==================== */

// GET /api/products - Get all products with filters
router.get(
  "/",
  [
    query("category_id").optional().isUUID(),
    query("brand_id").optional().isUUID(),
    query("min_price").optional().isFloat({ min: 0 }),
    query("max_price").optional().isFloat({ min: 0 }),
    query("search").optional().isString(),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("offset").optional().isInt({ min: 0 }),
  ],
  productController.fetchAllProducts
);

// GET /api/products/:id - Get single product
router.get("/:id", productController.fetchProductById);

// GET /api/products/variations/:variationId/stock - Check stock availability
router.get(
  "/variations/:variationId/stock",
  productController.checkStockAvailability
);

// GET /api/products/categories - Get all categories
router.get("/categories", productController.fetchAllCategories);

/* ==================== PROTECTED ROUTES (ANY AUTHENTICATED) ==================== */

// These routes require authentication but not admin

/* ==================== ADMIN ROUTES ==================== */
// Accessible by: Store Chief, Hype Lead, Founder

// POST /api/products - Create new product
router.post(
  "/",
  protectRoute,
  adminProtect,
  productValidation,
  productController.createNewProduct
);

// PATCH /api/products/:id - Update product
router.patch(
  "/:id",
  protectRoute,
  adminProtect,
  updateProductValidation,
  productController.updateProduct
);

// PATCH /api/products/:id/deactivate - Soft delete (deactivate)
router.patch(
  "/:id/deactivate",
  protectRoute,
  adminProtect,
  productController.softDeleteProduct
);

// PATCH /api/products/variations/:variationId/stock - Update stock
router.patch(
  "/variations/:variationId/stock",
  protectRoute,
  adminProtect,
  stockValidation,
  productController.updateStock
);

// POST /api/products/categories - Create category
router.post(
  "/categories",
  protectRoute,
  adminProtect,
  categoryValidation,
  productController.createNewCategory
);

// POST /api/products/bulk-update - Bulk update products
router.post(
  "/bulk-update",
  protectRoute,
  adminProtect,
  productController.bulkUpdateProducts
);

/* ==================== SUPER ADMIN ROUTES ==================== */
// Accessible by: Founder only

// DELETE /api/products/:id - Hard delete (permanent)
router.delete(
  "/:id",
  protectRoute,
  superAdminProtect,
  productController.hardDeleteProduct
);

/* ==================== ROUTE DOCUMENTATION ==================== */

/**
 * ROUTE ACCESS LEVELS:
 *
 * PUBLIC (no auth):
 * - GET /api/products (list with filters)
 * - GET /api/products/:id (single product)
 * - GET /api/products/variations/:variationId/stock (check stock)
 * - GET /api/products/categories (list categories)
 *
 * ADMIN (Store Chief, Hype Lead, Founder):
 * - POST /api/products (create)
 * - PATCH /api/products/:id (update)
 * - PATCH /api/products/:id/deactivate (soft delete)
 * - PATCH /api/products/variations/:variationId/stock (update stock)
 * - POST /api/products/categories (create category)
 * - POST /api/products/bulk-update (bulk operations)
 *
 * SUPER ADMIN (Founder only):
 * - DELETE /api/products/:id (permanent delete)
 */

module.exports = router;
