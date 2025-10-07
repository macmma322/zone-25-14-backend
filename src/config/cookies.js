// cookies.js
// Configuration for session/auth cookies
// Usage: const { SESSION_COOKIE_NAME, SESSION_SET_OPTIONS, SESSION_CLEAR_OPTIONS } = require('../config/cookies');
//        res.cookie(SESSION_COOKIE_NAME, token, SESSION_SET_OPTIONS); // set
//        res.clearCookie(SESSION_COOKIE_NAME, SESSION_CLEAR_OPTIONS); // clear
// Note: Adjust options as needed for your security requirements

const isProd = process.env.NODE_ENV === "production";

const SESSION_COOKIE_NAME = "authToken";

// used when SETTING the cookie
const SESSION_SET_OPTIONS = {
  httpOnly: true,
  secure: isProd, // must be true if sameSite === 'none'
  sameSite: "lax", // use 'none' only for cross-site + HTTPS
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  // domain: ".yourdomain.com", // only if you explicitly set a domain
};

// used when CLEARING the cookie (NO maxAge)
const SESSION_CLEAR_OPTIONS = {
  httpOnly: true,
  secure: isProd,
  sameSite: "lax",
  path: "/",
  // domain: ".yourdomain.com", // must match if you used it when setting
};

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_SET_OPTIONS,
  SESSION_CLEAR_OPTIONS,
};
