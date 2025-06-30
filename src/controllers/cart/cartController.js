const pool = require("../../config/db"); // Adjust the path as necessary

// ▪️ Add Item to Cart
const addToCart = async (req, res) => {
  try {
    const { product_variation_id, quantity } = req.body;
    const userId = req.user.userId;

    if (!product_variation_id || !quantity || quantity < 1) {
      return res.status(400).json({
        message: "Product variation and valid quantity are required.",
      });
    }

    // Check if item already exists in cart
    const existing = await pool.query(
      `SELECT * FROM shopping_cart WHERE user_id = $1 AND product_variation_id = $2`,
      [userId, product_variation_id]
    );

    if (existing.rows.length > 0) {
      // Item exists → update quantity
      const newQuantity = existing.rows[0].quantity + quantity;
      await pool.query(`UPDATE shopping_cart SET quantity = $1 WHERE id = $2`, [
        newQuantity,
        existing.rows[0].id,
      ]);
      return res.status(200).json({ message: "Cart updated successfully." });
    } else {
      // Item doesn't exist → insert new
      await pool.query(
        `INSERT INTO shopping_cart (user_id, product_variation_id, quantity) VALUES ($1, $2, $3)`,
        [userId, product_variation_id, quantity]
      );
      return res.status(201).json({ message: "Item added to cart." });
    }
  } catch (error) {
    console.error("Add to Cart Error:", error.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ▪️ Get User's Cart
const getCart = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { rows } = await pool.query(
      `SELECT sc.id, sc.quantity, sc.added_at, pv.size, pv.color, pv.special_edition,
              p.name, p.base_price, p.currency_code
       FROM shopping_cart sc
       JOIN product_variations pv ON sc.product_variation_id = pv.variation_id
       JOIN products p ON pv.product_id = p.product_id
       WHERE sc.user_id = $1`,
      [userId]
    );

    // Calculate subtotal
    let subtotal = 0;

    const cartItems = rows.map((item) => {
      const itemPrice = parseFloat(item.base_price) * item.quantity;
      subtotal += itemPrice;

      return {
        ...item,
        item_total: itemPrice.toFixed(2), // price * quantity
      };
    });

    res.status(200).json({
      cart: cartItems,
      subtotal: subtotal.toFixed(2),
      currency: rows.length > 0 ? rows[0].currency_code : "USD",
    });
  } catch (error) {
    console.error("Get Cart Error:", error.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ▪️ Update Cart Item Quantity
const updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const userId = req.user.userId;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1." });
    }

    const { rowCount } = await pool.query(
      `UPDATE shopping_cart SET quantity = $1 WHERE id = $2 AND user_id = $3`,
      [quantity, itemId, userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: "Cart item not found." });
    }

    res.status(200).json({ message: "Cart item quantity updated." });
  } catch (error) {
    console.error("Update Cart Item Error:", error.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ▪️ Remove Item from Cart
const removeCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.userId;

    const { rowCount } = await pool.query(
      `DELETE FROM shopping_cart WHERE id = $1 AND user_id = $2`,
      [itemId, userId]
    );

    if (rowCount === 0) {
      return res.status(404).json({ message: "Cart item not found." });
    }

    res.status(200).json({ message: "Item removed from cart." });
  } catch (error) {
    console.error("Remove Cart Item Error:", error.message);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
};