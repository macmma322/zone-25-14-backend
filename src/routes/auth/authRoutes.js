//F:\zone-25-14\zone-25-14-backend\src\routes\auth\authRoutes.js
const express = require("express");
const { register, login } = require("../../controllers/auth/authController");
const router = express.Router();

// In your authRoutes.js or similar
router.post("/logout", (req, res) => {
  res.clearCookie("authToken", {
    path: "/",
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  });
  res.status(200).json({ message: "Logged out successfully" });
});

module.exports = router;

router.post("/register", register); // <-- ✅ Register route
router.post("/login", login); // <-- ✅ Login route

module.exports = router;
