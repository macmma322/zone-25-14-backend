// File: src/config/redis.js
// Description: Redis client setup for presence tracking and general caching
// Dependencies: ioredis

const Redis = require("ioredis");

// You can modify this connection string if you're running Redis on another host or port
const redis = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined, // optional
});

redis.on("connect", () => {
  console.log("🔌 Redis connected");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err);
});

module.exports = redis;
