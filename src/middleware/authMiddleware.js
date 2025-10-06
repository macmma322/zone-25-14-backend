// zone-25-14-backend/src/middleware/authMiddleware.js
// Authentication middleware for Express routes
// Functions: protectRoute (strict), requireAuthOptional (optional)
// Usage: const { protectRoute, requireAuthOptional } = require('../middleware/authMiddleware');
//        app.use('/protected-route', protectRoute, handler); // requires valid token
//        app.use('/optional-route', requireAuthOptional, handler); // attaches req.user if valid token; otherwise guest
const jwt = require("jsonwebtoken");

/** normalize payload → req.user */
function toReqUser(payload) {
  const user_id = payload.user_id ?? payload.userId ?? payload.sub ?? null;
  const user = {
    user_id,
    userId: user_id, // alias to avoid downstream mismatch
    username: payload.username ?? null,
    role: payload.role ?? null,
  };
  return user;
}

function extractToken(req) {
  // 1) Cookie
  if (req.cookies?.authToken) return req.cookies.authToken;
  // 2) Authorization: Bearer <token>
  const h = req.headers?.authorization;
  if (h && /^Bearer\s+/i.test(h)) return h.replace(/^Bearer\s+/i, "");
  return null;
}

/** Strict: requires a valid token */
function protectRoute(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = toReqUser(decoded);
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, invalid token" });
  }
}

/** Optional: attach req.user if token present/valid; otherwise continue as guest */
function requireAuthOptional(req, _res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = toReqUser(decoded);
  } catch {
    // invalid token → treat as guest
    req.user = null;
  }
  return next();
}

module.exports = { protectRoute, requireAuthOptional };
