const express = require("express");
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Protect the route using authMiddleware
router.put("/update-role", authMiddleware, userController.updateUserRole);

module.exports = router;
