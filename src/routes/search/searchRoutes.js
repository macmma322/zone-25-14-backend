// src/routes/search.js
const express = require("express");
const router = express.Router();
const { searchAll } = require("../../controllers/search/searchController");

router.get("/", searchAll); // /api/search?q=yourQuery

module.exports = router;
