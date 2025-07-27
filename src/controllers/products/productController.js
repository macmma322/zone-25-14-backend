// zone-25-14-backend/src/controllers/products/productController.js
// This file contains the logic for handling product-related requests
// such as fetching, creating, updating, and deleting products.
// It interacts with the product model for database operations
// and uses notification service to send updates to users.

const { validationResult } = require("express-validator");
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProductInDb,
  softDeleteProductInDb,
  hardDeleteProductInDb,
} = require("../../models/productModel");

// Fetch all products
const fetchAllProducts = async (req, res) => {
  try {
    const products = await getAllProducts();
    res.status(200).json({ success: true, products });
  } catch (err) {
    console.error("Error fetching products:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching products.",
    });
  }
};

// Fetch single product by ID
const fetchProductById = async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    res.status(200).json({ success: true, product });
  } catch (err) {
    console.error("Error fetching product by ID:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error while fetching product.",
    });
  }
};

// Admin: Create new product
const createNewProduct = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const newProduct = await createProduct(req.body);
    res.status(201).json({
      success: true,
      message: "Product created successfully",
      product: newProduct,
    });
  } catch (err) {
    console.error("Error creating product:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error while creating product.",
    });
  }
};

// Admin: Update product
const updateProduct = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    base_price,
    currency_code,
    is_exclusive,
    is_active,
  } = req.body;

  try {
    const updatedProduct = await updateProductInDb(id, {
      name,
      description,
      base_price,
      currency_code,
      is_exclusive,
      is_active,
    });
    if (!updatedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }
    res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (err) {
    console.error("Error updating product:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error while updating product.",
    });
  }
};

// Admin: Soft delete product (set is_active = false)
const softDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await softDeleteProductInDb(id);
    if (!deletedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }
    res.status(200).json({
      success: true,
      message: "Product soft deleted successfully",
      product: deletedProduct,
    });
  } catch (err) {
    console.error("Error soft deleting product:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error while soft deleting product.",
    });
  }
};

// Admin: Hard delete product (remove from database)
const hardDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedProduct = await hardDeleteProductInDb(id);
    if (!deletedProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found." });
    }
    res
      .status(200)
      .json({ success: true, message: "Product hard deleted successfully." });
  } catch (err) {
    console.error("Error hard deleting product:", err.message);
    res.status(500).json({
      success: false,
      message: "Server error while hard deleting product.",
    });
  }
};

module.exports = {
  fetchAllProducts,
  fetchProductById,
  createNewProduct,
  updateProduct,
  softDeleteProduct,
  hardDeleteProduct,
};
