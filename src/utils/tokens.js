// Utility helpers for opaque tokens and hashing (CommonJS)
const crypto = require("crypto");

function makeOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url"); // URL-safe
}

function sha256(input) {
  return crypto.createHash("sha256").update(input).digest(); // Buffer
}

function sha256Hex(input) {
  return crypto.createHash("sha256").update(input).digest("hex"); // string
}

function timingSafeEqual(a, b) {
  const A = Buffer.isBuffer(a) ? a : Buffer.from(a);
  const B = Buffer.isBuffer(b) ? b : Buffer.from(b);
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

function verifyOpaqueTokenAgainstHash(token, storedHash) {
  const calc = sha256(token);
  return timingSafeEqual(calc, storedHash);
}

module.exports = {
  makeOpaqueToken,
  sha256,
  sha256Hex,
  timingSafeEqual,
  verifyOpaqueTokenAgainstHash,
};
