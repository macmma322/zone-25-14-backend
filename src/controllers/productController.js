const { getAllProducts, getProductById, createProduct } = require('../models/productModel');

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

module.exports = {
  fetchAllProducts,
  fetchProductById,
  createNewProduct,
};
