// src/config/db.js
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  ssl: false, // Change to true only if using SSL connection in production (Heroku, AWS, etc)
});

pool.on("connect", async (client) => {
  await client.query("SELECT set_config('zone.enc_key', $1, false)", [
    process.env.ENCRYPTION_SECRET,
  ]);
});
module.exports = pool;
