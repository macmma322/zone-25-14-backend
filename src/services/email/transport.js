// zone-25-14-backend/src/services/email/transport.js
// Low-level email transport
// Functions: send(opts)
// Usage: const { send } = require('./services/email/transport');
//        await send({ to, subject, html, text, headers });
// File: src/services/email/transport.js
// Low-level Nodemailer transport with provider switch + verify + better defaults

const nodemailer = require("nodemailer");

const provider = (process.env.EMAIL_PROVIDER || "smtp").toLowerCase();

const FROM = {
  name: process.env.EMAIL_FROM_NAME || "Zone 25-14",
  // default 'from' to SMTP_USER if EMAIL_FROM_ADDR is not explicitly set
  email:
    process.env.EMAIL_FROM_ADDR ||
    process.env.SMTP_USER ||
    "no-reply@localhost",
};

function parseBool(v, fallback = false) {
  if (v == null) return fallback;
  const s = String(v).toLowerCase().trim();
  return ["1", "true", "yes", "y"].includes(s);
}

let transport; // cached transporter

async function getTransport() {
  if (transport) return transport;

  if (provider === "ethereal") {
    // auto-create account if not provided
    let user = process.env.ETHEREAL_USER;
    let pass = process.env.ETHEREAL_PASS;
    if (!user || !pass) {
      const acct = await nodemailer.createTestAccount();
      user = acct.user;
      pass = acct.pass;
      console.log("[mail] Ethereal test account:", user);
    }
    transport = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: { user, pass },
      // timeouts
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
    return transport;
  }

  if (provider === "mailtrap") {
    transport = nodemailer.createTransport({
      host: process.env.MAILTRAP_HOST,
      port: Number(process.env.MAILTRAP_PORT || 2525),
      secure: false,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
    });
    return transport;
  }

  // default: SMTP (Gmail, etc.)
  const port = Number(process.env.SMTP_PORT || 465);
  const secure =
    process.env.SMTP_SECURE != null
      ? parseBool(process.env.SMTP_SECURE)
      : port === 465; // implicit SSL on 465, STARTTLS on 587

  // optional pooled connections (set MAIL_POOL=true to enable)
  const usePool = parseBool(process.env.MAIL_POOL, false);

  const base = {
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  };

  transport = usePool
    ? nodemailer.createTransport({
        ...base,
        pool: true,
        maxConnections: Number(process.env.MAIL_POOL_CONN || 3),
        maxMessages: Number(process.env.MAIL_POOL_MSG || 100),
      })
    : nodemailer.createTransport(base);

  return transport;
}

async function send({ to, subject, html, text, headers }) {
  const t = await getTransport();

  // Ensure From is sane: Gmail often requires from === authenticated user (or verified alias)
  const fromAddr = FROM.email || process.env.SMTP_USER;
  const info = await t.sendMail({
    from: `"${FROM.name}" <${fromAddr}>`,
    to,
    subject,
    html,
    text,
    headers,
  });

  // Ethereal preview URL (nice for dev)
  const previewUrl =
    provider === "ethereal" ? nodemailer.getTestMessageUrl(info) : null;

  return { providerMessageId: info.messageId, previewUrl };
}

// Optional: call once on server startup
async function verifyTransport() {
  try {
    const t = await getTransport();
    await t.verify();
    console.log("[mail] SMTP connection OK (provider:", provider + ")");
  } catch (e) {
    // common Gmail hint
    if (String(e?.response || e?.message).includes("535")) {
      console.error(
        "[mail] SMTP verify failed: 535 Invalid login. For Gmail, use a 16-char App Password and ensure EMAIL_FROM_ADDR matches SMTP_USER."
      );
    }
    console.error("[mail] SMTP verify failed:", e.message);
  }
}

module.exports = { send, provider, verifyTransport };
