const pool = require('../config/db');
const { getAllProducts, getProductById, createProduct } = require('../models/productModel');
const { validationResult } = require('express-validator');

// Fetch all products
const fetchAllProducts = async (req, res) => {
  try {
    const products = await getAllProducts();
    res.status(200).json(products);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Fetch single product
const fetchProductById = async (req, res) => {
  try {
    const product = await getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(product);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Create product
const createNewProduct = async (req, res) => {
  try {
    const newProduct = await createProduct(req.body);
    res.status(201).json(newProduct);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// ▪️ Update Product (Admin Only)
const updateProduct = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, base_price, is_exclusive, is_active } = req.body;

    const updateFields = [];
    const values = [];
    let idx = 1;

    if (name) {
      updateFields.push(`name = $${idx++}`);
      values.push(name);
    }
    if (description) {
      updateFields.push(`description = $${idx++}`);
      values.push(description);
    }
    if (base_price) {
      updateFields.push(`base_price = $${idx++}`);
      values.push(base_price);
    }
    if (is_exclusive !== undefined) {
      updateFields.push(`is_exclusive = $${idx++}`);
      values.push(is_exclusive);
    }
    if (is_active !== undefined) {
      updateFields.push(`is_active = $${idx++}`);
      values.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: 'No fields provided to update.' });
    }

    values.push(id); // Product ID for WHERE clause

    const query = `
      UPDATE products
      SET ${updateFields.join(', ')}
      WHERE product_id = $${idx}
      RETURNING *;
    `;

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    res.status(200).json({ message: 'Product updated successfully.', product: rows[0] });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ▪️ Soft Delete Product (Set is_active = false)
const softDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      UPDATE products
      SET is_active = false
      WHERE product_id = $1
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    res.status(200).json({ message: 'Product soft deleted.', product: rows[0] });
  } catch (error) {
    console.error('Soft delete error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

// ▪️ Hard Delete Product (Remove from database)
const hardDeleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      DELETE FROM products
      WHERE product_id = $1
      RETURNING *;
    `;

    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    res.status(200).json({ message: 'Product hard deleted.' });
  } catch (error) {
    console.error('Hard delete error:', error);
    res.status(500).json({ message: 'Server error.' });
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

