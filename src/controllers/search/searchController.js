// src/controllers/searchController.js
const pool = require("../../config/db.js");

exports.searchAll = async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim() === "") {
    return res.status(400).json({ error: "Missing search query" });
  }

  const query = `%${q.toLowerCase()}%`;

  try {
    // Searching for users
    const users = await pool.query(
      `SELECT user_id, username, first_name, last_name FROM users
       WHERE LOWER(username) ILIKE $1
       OR LOWER(first_name) ILIKE $1
       OR LOWER(last_name) ILIKE $1
       LIMIT 10`,
      [query]
    );

    // Searching for products
    const products = await pool.query(
      `SELECT product_id, name, description FROM products
       WHERE LOWER(name) ILIKE $1
       OR LOWER(description) ILIKE $1
       LIMIT 10`,
      [query]
    );

    // Searching for blog posts
    const blogPosts = await pool.query(
      `SELECT post_id, title FROM blog_posts
       WHERE LOWER(title) ILIKE $1
       LIMIT 10`,
      [query]
    );

    // Searching for events
    const events = await pool.query(
      `SELECT event_id, name, description FROM events
       WHERE LOWER(name) ILIKE $1
       OR LOWER(description) ILIKE $1
       LIMIT 10`,
      [query]
    );

    // Return all results
    return res.json({
      users: users.rows,
      products: products.rows,
      blogPosts: blogPosts.rows,
      events: events.rows,
    });
  } catch (error) {
    console.error("Search failed:", error);
    return res.status(500).json({ error: "Search failed on server" });
  }
};
