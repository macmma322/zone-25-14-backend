// src/controllers/auth/passwordResetController.js
const pool = require("../../config/db");
const bcrypt = require("bcryptjs");
const { makeOpaqueToken, sha256 } = require("../../utils/tokens");
const { sendEmail } = require("../../services/email/emailService");
const Templates = require("../../services/email/templates");

const RESET_TTL_MINUTES = 30;

exports.requestReset = async (req, res) => {
  try {
    const raw = (req.body?.email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
      return res.status(400).json({ message: "Invalid email." });
    }

    const uq = await pool.query(
      `SELECT user_id, username, email FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1`,
      [raw]
    );
    const user = uq.rows[0];

    // Always respond 200 to avoid user enumeration
    if (!user) return res.json({ ok: true });

    // Create one-time token (opaque) and store hash
    const token = makeOpaqueToken(32);
    const tokenHash = sha256(token); // Buffer
    const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60 * 1000);

    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_ip, created_ua)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        user.user_id,
        tokenHash,
        expiresAt,
        req.ip || null,
        req.headers["user-agent"] || null,
      ]
    );

    // Email content
    const resetUrl = `${
      process.env.APP_BASE_URL
    }/auth/reset?token=${encodeURIComponent(token)}`;
    const html = Templates.ResetPassword({ username: user.username, resetUrl });

    // Send email
    const { providerMessageId, previewUrl } = await sendEmail({
      to: user.email,
      subject: "Reset your Zone 25-14 password",
      html,
      text: `Reset your password: ${resetUrl}`,
      category: "password_reset",
      meta: { user_id: user.user_id },
    });

    // In dev, return previewUrl (Ethereal) to make testing easy
    const dev =
      process.env.NODE_ENV !== "production" ||
      process.env.EMAIL_PROVIDER === "ethereal";
    return res.json({ ok: true, ...(dev && previewUrl ? { previewUrl } : {}) });
  } catch (err) {
    console.error("requestReset error:", err);
    return res.status(500).json({ message: "Internal error." });
  }
};

exports.performReset = async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (
      !token ||
      typeof token !== "string" ||
      !password ||
      password.length < 8
    ) {
      return res.status(400).json({ message: "Invalid payload." });
    }

    const tokenHash = sha256(token);
    const q = await pool.query(
      `SELECT token_id, user_id, expires_at, used_at
         FROM password_reset_tokens
        WHERE token_hash = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [tokenHash]
    );

    const row = q.rows[0];
    if (!row)
      return res.status(400).json({ message: "Invalid or expired token." });
    if (row.used_at)
      return res.status(400).json({ message: "Token already used." });
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return res.status(400).json({ message: "Token expired." });
    }

    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(password, salt);

    await pool.query("BEGIN");
    await pool.query(`UPDATE users SET password_hash=$2 WHERE user_id=$1`, [
      row.user_id,
      hash,
    ]);
    await pool.query(
      `UPDATE password_reset_tokens SET used_at=NOW() WHERE token_id=$1`,
      [row.token_id]
    );
    await pool.query("COMMIT");

    return res.json({ ok: true });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("performReset error:", err);
    return res.status(500).json({ message: "Internal error." });
  }
};
