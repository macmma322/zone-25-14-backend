// zone-25-14-backend/src/controllers/products/productController.js
// This file contains the logic for handling product-related requests
// such as fetching, creating, updating, and deleting products.
// It interacts with the product model for database operations
// and uses notification service to send updates to users.
// Enhanced product controller with full CRUD and validation

const { validationResult } = require("express-validator");
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProductInDb,
  softDeleteProductInDb,
  hardDeleteProductInDb,
  updateVariationStock,
  checkStock,
  getAllCategories,
  createCategory,
} = require("../../models/productModel");

/* ==================== PRODUCTS ==================== */

// Fetch all products with filters (PUBLIC)
const fetchAllProducts = async (req, res) => {
  try {
    const filters = {
      category_id: req.query.category_id,
      brand_id: req.query.brand_id,
      min_price: req.query.min_price,
      max_price: req.query.max_price,
      search: req.query.search,
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
    };

    const products = await getAllProducts(filters);

    res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (err) {
    console.error("Error fetching products:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch products",
    });
  }
};

// Fetch single product by ID (PUBLIC)
const fetchProductById = async (req, res) => {
  try {
    const product = await getProductById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      product,
    });
  } catch (err) {
    console.error("Error fetching product:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch product",
    });
  }
};

// Create new product (ADMIN)
const createNewProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const productData = {
      brand_id: req.body.brand_id,
      name: req.body.name,
      description: req.body.description,
      base_price: parseFloat(req.body.base_price),
      currency_code: req.body.currency_code || "USD",
      exclusive_to_niche: req.body.exclusive_to_niche,
      is_exclusive: req.body.is_exclusive || false,
      images: req.body.images || [],
      variations: req.body.variations || [],
      category_ids: req.body.category_ids || [],
    };

    const newProduct = await createProduct(productData);

    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: newProduct,
    });
  } catch (err) {
    console.error("Error creating product:", err.message);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to create product",
    });
  }
};

// Update product (ADMIN)
const updateProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const { id } = req.params;

    // Check if product exists
    const existingProduct = await getProductById(id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const updateData = {
      name: req.body.name,
      description: req.body.description,
      base_price: req.body.base_price
        ? parseFloat(req.body.base_price)
        : undefined,
      currency_code: req.body.currency_code,
      is_exclusive: req.body.is_exclusive,
      is_active: req.body.is_active,
      exclusive_to_niche: req.body.exclusive_to_niche,
      images: req.body.images,
      variations: req.body.variations,
      category_ids: req.body.category_ids,
    };

    const updatedProduct = await updateProductInDb(id, updateData);

    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (err) {
    console.error("Error updating product:", err.message);
    res.status(500).json({
      success: false,
      message: err.message || "Failed to update product",
    });
  }
};

// Soft delete product (ADMIN)
const softDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProduct = await softDeleteProductInDb(id);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product deactivated successfully",
      product: deletedProduct,
    });
  } catch (err) {
    console.error("Error soft deleting product:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate product",
    });
  }
};

// Hard delete product (ADMIN - SUPER ADMIN only)
const hardDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedProduct = await hardDeleteProductInDb(id);

    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Product permanently deleted",
    });
  } catch (err) {
    console.error("Error hard deleting product:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete product",
    });
  }
};

/* ==================== STOCK MANAGEMENT ==================== */

// Update stock for a variation (ADMIN)
const updateStock = async (req, res) => {
  try {
    const { variationId } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== "number") {
      return res.status(400).json({
        success: false,
        message: "Quantity must be a number",
      });
    }

    const updatedVariation = await updateVariationStock(variationId, quantity);

    if (!updatedVariation) {
      return res.status(404).json({
        success: false,
        message: "Variation not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Stock updated successfully",
      variation: updatedVariation,
    });
  } catch (err) {
    console.error("Error updating stock:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to update stock",
    });
  }
};

// Check stock availability (PUBLIC)
const checkStockAvailability = async (req, res) => {
  try {
    const { variationId } = req.params;
    const { quantity } = req.query;

    const requestedQuantity = parseInt(quantity) || 1;
    const available = await checkStock(variationId, requestedQuantity);

    res.status(200).json({
      success: true,
      available,
      requested_quantity: requestedQuantity,
    });
  } catch (err) {
    console.error("Error checking stock:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to check stock",
    });
  }
};

/* ==================== CATEGORIES ==================== */

// Get all categories (PUBLIC)
const fetchAllCategories = async (req, res) => {
  try {
    const categories = await getAllCategories();

    res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (err) {
    console.error("Error fetching categories:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

// Create category (ADMIN)
const createNewCategory = async (req, res) => {
  try {
    const { category_name, description } = req.body;

    if (!category_name) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const newCategory = await createCategory({ category_name, description });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category: newCategory,
    });
  } catch (err) {
    console.error("Error creating category:", err.message);
    res.status(500).json({
      success: false,
      message: "Failed to create category",
    });
  }
};

/* ==================== BULK OPERATIONS ==================== */

// Bulk update products (ADMIN)
const bulkUpdateProducts = async (req, res) => {
  try {
    const { product_ids, update_data } = req.body;

    if (!Array.isArray(product_ids) || product_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Product IDs array is required",
      });
    }

    const results = [];
    const errors = [];

    for (const id of product_ids) {
      try {
        const updated = await updateProductInDb(id, update_data);
        results.push({ id, status: "success", product: updated });
      } catch (err) {
        errors.push({ id, status: "failed", error: err.message });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk update completed. ${results.length} succeeded, ${errors.length} failed.`,
      results,
      errors,
    });
  } catch (err) {
    console.error("Error in bulk update:", err.message);
    res.status(500).json({
      success: false,
      message: "Bulk update failed",
    });
  }
};

module.exports = {
  // Products
  fetchAllProducts,
  fetchProductById,
  createNewProduct,
  updateProduct,
  softDeleteProduct,
  hardDeleteProduct,

  // Stock
  updateStock,
  checkStockAvailability,

  // Categories
  fetchAllCategories,
  createNewCategory,

  // Bulk
  bulkUpdateProducts,
};
