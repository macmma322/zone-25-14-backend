const pool = require('../config/db');

// Get all active products
const getAllProducts = async () => {
  const query = `
    SELECT * FROM products
    WHERE is_active = TRUE
    ORDER BY created_at DESC
  `;
  const { rows } = await pool.query(query);
  return rows;
};

// Get single product by ID
const getProductById = async (id) => {
  const query = `
    SELECT * FROM products
    WHERE product_id = $1 AND is_active = TRUE
  `;
  const { rows } = await pool.query(query, [id]);
  return rows[0];
};

// Create new product (Admin)
const createProduct = async (productData) => {
  const {
    brand_id, name, description, base_price, currency_code, exclusive_to_niche, is_exclusive
  } = productData;

  const query = `
    INSERT INTO products (brand_id, name, description, base_price, currency_code, exclusive_to_niche, is_exclusive)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  const values = [
    brand_id, name, description, base_price, currency_code, exclusive_to_niche, is_exclusive
  ];

  const { rows } = await pool.query(query, values);
  return rows[0];
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
};
