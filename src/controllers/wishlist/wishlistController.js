const pool = require("../../config/db");

// ▪️ Add to Wishlist
exports.addToWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ message: "Product ID is required." });
    }

    // Check if already in wishlist
    const existing = await pool.query(
      `SELECT * FROM wishlist WHERE user_id = $1 AND product_id = $2`,
      [userId, product_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Product already in wishlist." });
    }

    // Add to wishlist
    await pool.query(
      `INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2)`,
      [userId, product_id]
    );

    res.status(201).json({ message: "Added to wishlist." });
  } catch (error) {
    console.error("Add to Wishlist Error:", error.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ▪️ Get User's Wishlist
exports.getWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { rows } = await pool.query(
      `SELECT w.id, w.added_at, p.product_id, p.name, p.description, p.base_price, p.currency_code
       FROM wishlist w
       JOIN products p ON w.product_id = p.product_id
       WHERE w.user_id = $1`,
      [userId]
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("Get Wishlist Error:", error.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ▪️ Remove from Wishlist
exports.removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemId } = req.params;

    const { rowCount } = await pool.query(
      `DELETE FROM wishlist WHERE id = $1 AND user_id = $2`,
      [itemId, userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: "Wishlist item not found." });
    }

    res.status(200).json({ message: "Removed from wishlist." });
  } catch (error) {
    console.error("Remove Wishlist Error:", error.message);
    res.status(500).json({ message: "Server error." });
  }
};
