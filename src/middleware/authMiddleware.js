const jwt = require("jsonwebtoken");

const protectRoute = (req, res, next) => {
  const token = req.cookies.authToken;

  if (!token) {
    console.warn("🚫 No token found in cookies.");
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  console.log("🍪 Incoming authToken cookie:", token); // ✅ log token

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("🔐 Token valid:", decoded); // ✅ log payload
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };
    next();
  } catch (err) {
    console.error("❌ Invalid token:", err.message);
    return res.status(401).json({ message: "Not authorized, invalid token" });
  }
};

module.exports = { protectRoute };
