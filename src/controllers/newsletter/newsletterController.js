// Description: Controller for handling newsletter subscription, dismissal, and status
// Functions: subscribe, dismiss, status, unsubscribe, sgWebhook
// Dependencies: pg (PostgreSQL client), db configuration, optional email and token services
// File: src/controllers/newsletter/newsletterController.js
// File: src/controllers/newsletter/newsletterController.js
// Controller for newsletter subscription, dismissal, status, unsubscribe, webhook

const pool = require("../../config/db");
const { sendEmail } = require("../../services/email/emailService");
const { NewsletterWelcome } = require("../../services/email/templates");

// Resolve base URLs for links in emails
const APP_URL = process.env.APP_BASE_URL || "http://localhost:3000"; // frontend
const API_URL =
  process.env.API_BASE_URL ||
  process.env.BACKEND_BASE_URL ||
  "http://localhost:5000"; // backend (for /unsubscribe)

function buildManageUrl() {
  return `${APP_URL}/account/newsletter`;
}
function buildUnsubUrl(email) {
  const u = new URL("/api/newsletter/unsubscribe", API_URL);
  u.searchParams.set("email", email);
  return u.toString();
}

exports.subscribe = async (req, res) => {
  try {
    const raw = (req.body?.email || "").trim();
    const email = raw.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email." });
    }

    const userId = req.user?.userId ?? null;
    // If logged in, try a friendly name; otherwise fall back to the mailbox part
    const username =
      req.user?.username ||
      (email.includes("@") ? email.split("@")[0] : "Member");

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

    // For logged users: flip flags in profile (DND here means “don’t nag with modal”)
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

    // Fire-and-forget welcome email (doesn't block response)
    (async () => {
      try {
        const manageUrl = buildManageUrl();
        const unsubUrl = buildUnsubUrl(email);
        const html = NewsletterWelcome({
          username,
          manageUrl,
        }).replace(
          '</div>\n    <div class="footer muted">',
          // Add a small unsubscribe line before footer (keeps your template generic)
          `<p class="muted" style="margin-top:14px">To unsubscribe, click <a href="${unsubUrl}">here</a>.</p>\n    </div>\n    <div class="footer muted">`
        );

        await sendEmail({
          to: email,
          subject: "Welcome to the Zone newsletter",
          html,
          text: `Welcome ${username}! You’re in. Manage preferences at ${manageUrl}. To unsubscribe: ${unsubUrl}`,
          category: "newsletter_welcome",
          meta: { source, userId },
        });
      } catch (mailErr) {
        console.error(
          "[newsletter.subscribe] email send failed:",
          mailErr.message
        );
      }
    })();

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
    const { email } = req.body || {};
    if (email) {
      const q = await pool.query(
        `SELECT status FROM newsletter_subscribers WHERE email = $1`,
        [email.toLowerCase()]
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
    // If you later use signed tokens for unsub:
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
      [String(email).toLowerCase(), now]
    );

    await pool.query(
      `UPDATE users SET newsletter_opt_in=false WHERE email=$1`,
      [String(email).toLowerCase()]
    );

    // Send them to a friendly page on the app
    return res.redirect("/newsletter/unsubscribed");
  } catch (err) {
    console.error("newsletter.unsubscribe", err);
    return res.status(500).send("Internal error");
  }
};

exports.sgWebhook = async (_req, res) => {
  try {
    // TODO: parse ESP events and update newsletter_subscribers status (‘bounced’, ‘complained’, etc.)
    return res.json({ ok: true });
  } catch (err) {
    console.error("newsletter.sgWebhook", err);
    return res.status(500).json({ message: "Internal error." });
  }
};
