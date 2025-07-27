// zone-25-14-backend/src/models/productModel.js
// This file contains functions to manage products in the database
// including fetching, creating, updating, and deleting products.
// It uses PostgreSQL for database operations.

const pool = require("../config/db");

// Get all active products
const getAllProducts = async () => {
  try {
    const query = `
      SELECT * FROM products
      WHERE is_active = TRUE
      ORDER BY created_at DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
  } catch (err) {
    console.error("Error fetching products:", err.message);
    throw new Error("Server error while fetching products.");
  }
};

// Get single product by ID
const getProductById = async (id) => {
  try {
    const query = `
      SELECT * FROM products
      WHERE product_id = $1 AND is_active = TRUE
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  } catch (err) {
    console.error("Error fetching product by ID:", err.message);
    throw new Error("Server error while fetching product.");
  }
};

// Create new product (Admin)
const createProduct = async (productData) => {
  const {
    brand_id,
    name,
    description,
    base_price,
    currency_code,
    exclusive_to_niche,
    is_exclusive,
  } = productData;

  try {
    const query = `
      INSERT INTO products (brand_id, name, description, base_price, currency_code, exclusive_to_niche, is_exclusive)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *;
    `;
    const values = [
      brand_id,
      name,
      description,
      base_price,
      currency_code,
      exclusive_to_niche,
      is_exclusive,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (err) {
    console.error("Error creating product:", err.message);
    throw new Error("Server error while creating product.");
  }
};

// Update product (Admin)
const updateProductInDb = async (id, updateFields) => {
  try {
    const {
      name,
      description,
      base_price,
      currency_code,
      is_exclusive,
      is_active,
    } = updateFields;

    const query = `
      UPDATE products
      SET name = $1, description = $2, base_price = $3, currency_code = $4, is_exclusive = $5, is_active = $6
      WHERE product_id = $7
      RETURNING *;
    `;
    const values = [
      name,
      description,
      base_price,
      currency_code,
      is_exclusive,
      is_active,
      id,
    ];
    const { rows } = await pool.query(query, values);

    return rows[0];
  } catch (err) {
    console.error("Error updating product:", err.message);
    throw new Error("Server error while updating product.");
  }
};

// Soft delete product (Set is_active = false)
const softDeleteProductInDb = async (id) => {
  try {
    const query = `
      UPDATE products
      SET is_active = FALSE
      WHERE product_id = $1
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  } catch (err) {
    console.error("Error soft deleting product:", err.message);
    throw new Error("Server error while soft deleting product.");
  }
};

// Hard delete product (Remove from database)
const hardDeleteProductInDb = async (id) => {
  try {
    const query = `
      DELETE FROM products
      WHERE product_id = $1
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  } catch (err) {
    console.error("Error hard deleting product:", err.message);
    throw new Error("Server error while hard deleting product.");
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProductInDb,
  softDeleteProductInDb,
  hardDeleteProductInDb,
};
