// Description: Controller for handling newsletter subscription, dismissal, and status
// Functions: subscribe, dismiss, status, unsubscribe, sgWebhook
// Dependencies: pg (PostgreSQL client), db configuration, optional email and token services
// File: src/controllers/newsletter/newsletterController.js
const pool = require("../../config/db");
// const { sendConfirmEmail } = require('../services/email'); // optional double opt-in
// const { signNewsletterToken, verifyNewsletterToken } = require('../services/tokens');

exports.subscribe = async (req, res) => {
  try {
    const raw = (req.body?.email || "").trim();
    const email = raw.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email." });
    }

    const userId = req.user?.userId ?? null;
    const source = "site-modal";
    const now = new Date().toISOString();

    const upsert = await pool.query(
      `
      INSERT INTO newsletter_subscribers (email, user_id, status, source, consent_version, consent_at, subscribed_at, last_event_at)
      VALUES ($1, $2, 'confirmed', $3, 'v1.0', $4, $4, $4)
      ON CONFLICT (email) DO UPDATE
        SET user_id = COALESCE(EXCLUDED.user_id, newsletter_subscribers.user_id),
            status = CASE
              WHEN newsletter_subscribers.status IN ('unsubscribed','bounced','complained') THEN newsletter_subscribers.status
              ELSE 'confirmed'
            END,
            source = EXCLUDED.source,
            consent_version = EXCLUDED.consent_version,
            consent_at = COALESCE(newsletter_subscribers.consent_at, EXCLUDED.consent_at),
            subscribed_at = COALESCE(newsletter_subscribers.subscribed_at, EXCLUDED.subscribed_at),
            last_event_at = EXCLUDED.last_event_at
      RETURNING *;
      `,
      [email, userId, source, now]
    );

    if (userId) {
      await pool.query(
        `
        UPDATE users
        SET newsletter_opt_in = true,
            newsletter_opt_in_at = COALESCE(newsletter_opt_in_at, $2),
            newsletter_dnd = true
        WHERE user_id = $1
        `,
        [userId, now]
      );
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("newsletter.subscribe", err);
    return res.status(500).json({ message: "Internal error." });
  }
};

exports.dismiss = async (req, res) => {
  try {
    if (!req.user?.userId)
      return res.status(401).json({ message: "Auth required" });
    await pool.query(
      `UPDATE users SET newsletter_dnd = true WHERE user_id = $1`,
      [req.user.userId]
    );
    return res.json({ ok: true });
  } catch (err) {
    console.error("newsletter.dismiss", err);
    return res.status(500).json({ message: "Internal error." });
  }
};

exports.status = async (req, res) => {
  try {
    // If logged in, trust user flags
    if (req.user?.userId) {
      const q = await pool.query(
        `SELECT newsletter_opt_in, newsletter_dnd FROM users WHERE user_id = $1`,
        [req.user.userId]
      );
      const row = q.rows[0];
      return res.json({
        subscribed: !!row?.newsletter_opt_in,
        dnd: !!row?.newsletter_dnd,
      });
    }
    // For guests, you could accept an email and check subscribers:
    const { email } = req.body || {};
    if (email) {
      const q = await pool.query(
        `SELECT status FROM newsletter_subscribers WHERE email = $1`,
        [email]
      );
      const subscribed = q.rows[0]?.status === "confirmed";
      return res.json({ subscribed, dnd: false });
    }
    return res.json({ subscribed: false, dnd: false });
  } catch (err) {
    console.error("newsletter.status", err);
    return res.status(500).json({ message: "Internal error." });
  }
};

exports.unsubscribe = async (req, res) => {
  try {
    const { token, email } = req.query;
    // if using tokens:
    // const payload = verifyNewsletterToken(token);
    // const email = payload.email;

    if (!email) return res.status(400).send("Missing email");

    const now = new Date().toISOString();
    await pool.query(
      `
      UPDATE newsletter_subscribers
      SET status='unsubscribed', unsubscribed_at=$2, last_event_at=$2
      WHERE email=$1
    `,
      [email, now]
    );

    // Also flip user profile if exists
    await pool.query(
      `
      UPDATE users
      SET newsletter_opt_in=false
      WHERE email=$1
    `,
      [email]
    );

    // Redirect to a friendly page
    return res.redirect("/newsletter/unsubscribed");
  } catch (err) {
    console.error("newsletter.unsubscribe", err);
    return res.status(500).send("Internal error");
  }
};

// Example ESP webhook handler (sketch)
exports.sgWebhook = async (req, res) => {
  try {
    // parse events and update status accordingly
    // e.g., 'bounce' -> status='bounced', 'spamreport' -> 'complained'
    return res.json({ ok: true });
  } catch (err) {
    console.error("newsletter.sgWebhook", err);
    return res.status(500).json({ message: "Internal error." });
  }
};
