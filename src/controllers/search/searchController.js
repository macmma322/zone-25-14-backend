// src/controllers/searchController.js
const pool = require("../../config/db.js");

exports.searchAll = async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim() === "") {
    return res.status(400).json({ error: "Missing search query" });
  }

  const query = `%${q.toLowerCase()}%`;

  try {
    const users = await pool.query(
      `SELECT user_id, username, first_name, last_name FROM users
       WHERE LOWER(username) ILIKE $1
       OR LOWER(first_name) ILIKE $1
       OR LOWER(last_name) ILIKE $1
       LIMIT 10`,
      [query]
    );

    // Return users only for now, rest are empty
    return res.json({
      products: [],
      users: users.rows,
      blogPosts: [],
      events: [],
    });
  } catch (error) {
    console.error("Search failed:", error);
    return res.status(500).json({ error: "Search failed on server" });
  }
};
