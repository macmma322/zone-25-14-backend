// zone-25-14-backend/src/middleware/rateLimit.js
// Throttle middleware for Express routes
// Usage: const rate = require('../middleware/rateLimit');
//        app.use('/some-route', rate({ windowMs: 15*60*1000, max: 20 }), handler); // limits to 20 requests per 15 minutes
const rateLimit = require("express-rate-limit");

const defaults = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res) => {
    res
      .status(429)
      .json({ message: "Too many requests. Please try again later." });
  },
};

module.exports = (opts = {}) => rateLimit({ ...defaults, ...opts });
