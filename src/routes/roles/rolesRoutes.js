const express = require("express");
const router = express.Router();
const pool = require("../../config/db");

router.get("/", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM user_roles_levels ORDER BY required_points ASC");
    res.json(rows);
  } catch (err) {
    console.error("Roles API Error:", err.message);
    res.status(500).json({ message: "Failed to fetch roles" });
  }
});

module.exports = router;
