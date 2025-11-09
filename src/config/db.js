// src/config/db.js
const { Pool } = require("pg");
const assert = require("assert");
require("dotenv").config();

function buildConfig() {
  // Prefer DATABASE_URL if present
  const connectionString = (process.env.DATABASE_URL || "").trim();

  // Toggle SSL easily (Render/Neon/Heroku often need SSL)
  const sslNeeded =
    (process.env.PGSSL || "").toLowerCase() === "true" ||
    process.env.NODE_ENV === "production";

  if (connectionString) {
    return {
      connectionString,
      ssl: sslNeeded ? { rejectUnauthorized: false } : false,
    };
  }

  // Discrete fields
  const host = (process.env.DB_HOST || "localhost").trim();
  const database = (process.env.DB_NAME || "").trim();
  const user = (process.env.DB_USER || "").trim();
  const rawPassword = process.env.DB_PASSWORD;
  const password =
    typeof rawPassword === "string" ? rawPassword : (rawPassword ?? "") + "";
  const port = Number(process.env.DB_PORT || 5432);

  // Guard rails (fail fast if something critical is missing)
  assert(database, "DB_NAME is missing");
  assert(user, "DB_USER is missing");
  assert(password, "DB_PASSWORD is missing (must be a non-empty string)");

  return {
    host,
    port,
    database,
    user,
    password,
    ssl: sslNeeded ? { rejectUnauthorized: false } : false,
  };
}

const pool = new Pool(buildConfig());

// Minimal safe connection log (never log password)
pool.on("connect", (client) => {
  const cp = client.connectionParameters || {};
  console.log("[DB] connected", {
    host: cp.host,
    db: cp.database,
    user: cp.user,
    ssl: !!cp.ssl,
  });
});

// Set encryption key per physical connection
pool.on("connect", async (client) => {
  const enc = (process.env.ENCRYPTION_SECRET || "").trim();
  if (!enc || enc.length < 16) {
    console.warn(
      "[DB] ENCRYPTION_SECRET missing/too short; length:",
      enc.length || 0
    );
    return;
  }
  // either form is fine:
  // await client.query("SET zone.enc_key = $1", [enc]);
  await client.query("SELECT set_config('zone.enc_key', $1, false)", [enc]);
  // Optional quick self-check (comment out in prod)
  // const { rows } = await client.query("SELECT length(current_setting('zone.enc_key', true)) AS len");
  // console.log("[DB] zone.enc_key length:", rows[0]?.len);
});

module.exports = pool;
