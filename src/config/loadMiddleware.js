// 🧱 Zone 25-14 – Centralized Middleware Loader

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

module.exports = function loadMiddlewares(app) {
  // 🔒 Body parser & cookies
  app.use(express.json());
  app.use(cookieParser());

  // 🌍 CORS config (adjust origin for production)
  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );

  // 🚫 Rate Limiting
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 min window
      max: 10000, // limit per IP
      message: "Too many requests from this IP, please try again later.",
    })
  );
};
