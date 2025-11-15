// src/models/productModel.js
// FIXED: Changed is_primary to is_main to match database schema
const pool = require("../config/db");

/* ==================== PRODUCTS ==================== */

// Get all active products with full details
const getAllProducts = async (filters = {}) => {
  try {
    let query = `
      SELECT 
        p.*,
        b.brand_name,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'image_id', pi.image_id,
          'image_url', pi.image_url,
          'is_main', pi.is_main,
          'uploaded_at', pi.uploaded_at
        )) FILTER (WHERE pi.image_id IS NOT NULL), '[]') as images,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'variation_id', pv.variation_id,
          'size', pv.size,
          'color', pv.color,
          'stock_quantity', pv.stock_quantity,
          'additional_price', pv.additional_price,
          'special_edition', pv.special_edition
        )) FILTER (WHERE pv.variation_id IS NOT NULL), '[]') as variations,
        COALESCE(json_agg(DISTINCT pc.category_id) FILTER (WHERE pc.category_id IS NOT NULL), '[]') as category_ids
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id
      LEFT JOIN product_variations pv ON p.product_id = pv.product_id
      LEFT JOIN product_categories pc ON p.product_id = pc.product_id
      WHERE p.is_active = TRUE
    `;

    const values = [];
    let paramCount = 1;

    // Add filters
    if (filters.category_id) {
      query += ` AND EXISTS (
        SELECT 1 FROM product_categories 
        WHERE product_id = p.product_id AND category_id = $${paramCount}
      )`;
      values.push(filters.category_id);
      paramCount++;
    }

    if (filters.brand_id) {
      query += ` AND p.brand_id = $${paramCount}`;
      values.push(filters.brand_id);
      paramCount++;
    }

    if (filters.min_price) {
      query += ` AND p.base_price >= $${paramCount}`;
      values.push(filters.min_price);
      paramCount++;
    }

    if (filters.max_price) {
      query += ` AND p.base_price <= $${paramCount}`;
      values.push(filters.max_price);
      paramCount++;
    }

    if (filters.search) {
      query += ` AND (
        LOWER(p.name) LIKE LOWER($${paramCount}) OR 
        LOWER(p.description) LIKE LOWER($${paramCount})
      )`;
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    query += `
      GROUP BY p.product_id, b.brand_name
      ORDER BY p.created_at DESC
    `;

    if (filters.limit) {
      query += ` LIMIT $${paramCount}`;
      values.push(filters.limit);
      paramCount++;
    }

    if (filters.offset) {
      query += ` OFFSET $${paramCount}`;
      values.push(filters.offset);
    }

    const { rows } = await pool.query(query, values);
    return rows;
  } catch (err) {
    console.error("Error fetching products:", err.message);
    throw new Error("Failed to fetch products");
  }
};

// Get single product by ID with full details
const getProductById = async (id) => {
  try {
    const query = `
      SELECT 
        p.*,
        b.brand_name,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'image_id', pi.image_id,
          'image_url', pi.image_url,
          'is_main', pi.is_main,
          'uploaded_at', pi.uploaded_at
        )) FILTER (WHERE pi.image_id IS NOT NULL), '[]') as images,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'variation_id', pv.variation_id,
          'size', pv.size,
          'color', pv.color,
          'stock_quantity', pv.stock_quantity,
          'additional_price', pv.additional_price,
          'special_edition', pv.special_edition
        )) FILTER (WHERE pv.variation_id IS NOT NULL), '[]') as variations,
        COALESCE(json_agg(DISTINCT jsonb_build_object(
          'category_id', c.category_id,
          'category_name', c.category_name
        )) FILTER (WHERE c.category_id IS NOT NULL), '[]') as categories
      FROM products p
      LEFT JOIN brands b ON p.brand_id = b.brand_id
      LEFT JOIN product_images pi ON p.product_id = pi.product_id
      LEFT JOIN product_variations pv ON p.product_id = pv.product_id
      LEFT JOIN product_categories pc ON p.product_id = pc.product_id
      LEFT JOIN categories c ON pc.category_id = c.category_id
      WHERE p.product_id = $1 AND p.is_active = TRUE
      GROUP BY p.product_id, b.brand_name
    `;

    const { rows } = await pool.query(query, [id]);
    return rows[0];
  } catch (err) {
    console.error("Error fetching product by ID:", err.message);
    throw new Error("Failed to fetch product");
  }
};

// Create new product with transaction
const createProduct = async (productData) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      brand_id,
      name,
      description,
      base_price,
      currency_code = "USD",
      exclusive_to_niche,
      is_exclusive = false,
      images = [],
      variations = [],
      category_ids = [],
    } = productData;

    // Insert product
    const productQuery = `
      INSERT INTO products (
        brand_id, name, description, base_price, currency_code, 
        exclusive_to_niche, is_exclusive, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
      RETURNING *
    `;
    const productValues = [
      brand_id,
      name,
      description,
      base_price,
      currency_code,
      exclusive_to_niche,
      is_exclusive,
    ];

    const {
      rows: [product],
    } = await client.query(productQuery, productValues);

    // Add images
    if (images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        await client.query(
          `INSERT INTO product_images (product_id, image_url, is_main)
           VALUES ($1, $2, $3)`,
          [
            product.product_id,
            img.image_url,
            img.is_primary || img.is_main || i === 0,
          ]
        );
      }
    }

    // Add variations
    if (variations.length > 0) {
      for (const variation of variations) {
        await client.query(
          `INSERT INTO product_variations (
            product_id, size, color, stock_quantity, special_edition, additional_price
          )
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            product.product_id,
            variation.size || null,
            variation.color || null,
            variation.stock_quantity || 0,
            variation.special_edition || null,
            variation.additional_price || 0,
          ]
        );
      }
    }

    // Add categories
    if (category_ids.length > 0) {
      for (const category_id of category_ids) {
        await client.query(
          `INSERT INTO product_categories (product_id, category_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [product.product_id, category_id]
        );
      }
    }

    await client.query("COMMIT");

    // Return full product with relations
    return await getProductById(product.product_id);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating product:", err.message);
    throw new Error("Failed to create product");
  } finally {
    client.release();
  }
};

// Update product with transaction
const updateProductInDb = async (id, updateData) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const {
      name,
      description,
      base_price,
      currency_code,
      is_exclusive,
      is_active,
      exclusive_to_niche,
      images,
      variations,
      category_ids,
    } = updateData;

    // Update base product
    const productQuery = `
      UPDATE products
      SET 
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        base_price = COALESCE($3, base_price),
        currency_code = COALESCE($4, currency_code),
        is_exclusive = COALESCE($5, is_exclusive),
        is_active = COALESCE($6, is_active),
        exclusive_to_niche = COALESCE($7, exclusive_to_niche)
      WHERE product_id = $8
      RETURNING *
    `;

    await client.query(productQuery, [
      name,
      description,
      base_price,
      currency_code,
      is_exclusive,
      is_active,
      exclusive_to_niche,
      id,
    ]);

    // Update images if provided
    if (images) {
      await client.query(`DELETE FROM product_images WHERE product_id = $1`, [
        id,
      ]);

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        await client.query(
          `INSERT INTO product_images (product_id, image_url, is_main)
           VALUES ($1, $2, $3)`,
          [id, img.image_url, img.is_primary || img.is_main || i === 0]
        );
      }
    }

    // Update variations if provided
    if (variations) {
      // Keep existing variations, update or add new ones
      for (const variation of variations) {
        if (variation.variation_id) {
          // Update existing
          await client.query(
            `UPDATE product_variations
             SET size = $1, color = $2, stock_quantity = $3, special_edition = $4, additional_price = $5
             WHERE variation_id = $6 AND product_id = $7`,
            [
              variation.size,
              variation.color,
              variation.stock_quantity,
              variation.special_edition,
              variation.additional_price || 0,
              variation.variation_id,
              id,
            ]
          );
        } else {
          // Add new
          await client.query(
            `INSERT INTO product_variations (
              product_id, size, color, stock_quantity, special_edition, additional_price
            )
            VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              id,
              variation.size,
              variation.color,
              variation.stock_quantity,
              variation.special_edition,
              variation.additional_price || 0,
            ]
          );
        }
      }
    }

    // Update categories if provided
    if (category_ids) {
      await client.query(
        `DELETE FROM product_categories WHERE product_id = $1`,
        [id]
      );

      for (const category_id of category_ids) {
        await client.query(
          `INSERT INTO product_categories (product_id, category_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [id, category_id]
        );
      }
    }

    await client.query("COMMIT");

    return await getProductById(id);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating product:", err.message);
    throw new Error("Failed to update product");
  } finally {
    client.release();
  }
};

// Soft delete (set is_active = false)
const softDeleteProductInDb = async (id) => {
  try {
    const query = `
      UPDATE products
      SET is_active = FALSE
      WHERE product_id = $1
      RETURNING *
    `;
    const { rows } = await pool.query(query, [id]);
    return rows[0];
  } catch (err) {
    console.error("Error soft deleting product:", err.message);
    throw new Error("Failed to soft delete product");
  }
};

// Hard delete (remove from database with cascade)
const hardDeleteProductInDb = async (id) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Delete in order due to foreign keys
    await client.query(`DELETE FROM product_images WHERE product_id = $1`, [
      id,
    ]);
    await client.query(`DELETE FROM product_variations WHERE product_id = $1`, [
      id,
    ]);
    await client.query(`DELETE FROM product_categories WHERE product_id = $1`, [
      id,
    ]);
    await client.query(`DELETE FROM product_tags WHERE product_id = $1`, [id]);

    const { rows } = await client.query(
      `DELETE FROM products WHERE product_id = $1 RETURNING *`,
      [id]
    );

    await client.query("COMMIT");
    return rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error hard deleting product:", err.message);
    throw new Error("Failed to hard delete product");
  } finally {
    client.release();
  }
};

/* ==================== STOCK MANAGEMENT ==================== */

// Update stock for a variation
const updateVariationStock = async (variationId, quantity) => {
  try {
    const query = `
      UPDATE product_variations
      SET stock_quantity = stock_quantity + $1
      WHERE variation_id = $2
      RETURNING *
    `;
    const { rows } = await pool.query(query, [quantity, variationId]);
    return rows[0];
  } catch (err) {
    console.error("Error updating stock:", err.message);
    throw new Error("Failed to update stock");
  }
};

// Check if variation has sufficient stock
const checkStock = async (variationId, requestedQuantity) => {
  try {
    const query = `
      SELECT stock_quantity
      FROM product_variations
      WHERE variation_id = $1
    `;
    const { rows } = await pool.query(query, [variationId]);

    if (rows.length === 0) return false;

    return rows[0].stock_quantity >= requestedQuantity;
  } catch (err) {
    console.error("Error checking stock:", err.message);
    throw new Error("Failed to check stock");
  }
};

/* ==================== CATEGORIES ==================== */

// Get all categories
const getAllCategories = async () => {
  try {
    const query = `
      SELECT c.*, COUNT(pc.product_id) as product_count
      FROM categories c
      LEFT JOIN product_categories pc ON c.category_id = pc.category_id
      GROUP BY c.category_id
      ORDER BY c.category_name
    `;
    const { rows } = await pool.query(query);
    return rows;
  } catch (err) {
    console.error("Error fetching categories:", err.message);
    throw new Error("Failed to fetch categories");
  }
};

// Create category
const createCategory = async (categoryData) => {
  try {
    const { category_name, description } = categoryData;
    const query = `
      INSERT INTO categories (category_name, description)
      VALUES ($1, $2)
      RETURNING *
    `;
    const { rows } = await pool.query(query, [category_name, description]);
    return rows[0];
  } catch (err) {
    console.error("Error creating category:", err.message);
    throw new Error("Failed to create category");
  }
};

module.exports = {
  // Products
  getAllProducts,
  getProductById,
  createProduct,
  updateProductInDb,
  softDeleteProductInDb,
  hardDeleteProductInDb,

  // Stock
  updateVariationStock,
  checkStock,

  // Categories
  getAllCategories,
  createCategory,
};
