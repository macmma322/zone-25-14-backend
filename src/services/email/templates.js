// Email HTML templates (CommonJS)
// Keep it simple & provider-agnostic. You can swap to MJML/Handlebars later.

const BRAND = {
  name: process.env.EMAIL_FROM_NAME || "Zone 25-14",
  baseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
  accent: "#FF2D00", // CTA button color
};

/* ----------------- helpers ----------------- */
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function layout({ title, body }) {
  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="color-scheme" content="dark light" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    /* Basic, inline-safe styles */
    .wrap { padding:24px;background:#0b0b0b;color:#eee;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,'Helvetica Neue',Arial,'Apple Color Emoji','Segoe UI Emoji'; }
    .card { width:100%; max-width:560px; margin:0 auto; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08);
            border-radius:16px; padding:24px; }
    .brand { text-align:center; padding-bottom:12px; }
    .brand img { border-radius:8px; }
    .title { font-size:18px; font-weight:700; padding:6px 0 12px 0; color:#fff; text-align:center; }
    .body { font-size:14px; line-height:1.6; color:#d7d7d7; }
    .cta { display:inline-block; background:${
      BRAND.accent
    }; color:#000; padding:12px 18px; border-radius:10px; text-decoration:none;
           font-weight:800; text-transform:uppercase; letter-spacing:0.4px; }
    .muted { color:#9b9b9b; font-size:12px; }
    .footer { padding-top:16px; text-align:center; }
    a { color:#9fd2ff; }
    .divider { height:1px; background:rgba(255,255,255,0.08); margin:16px 0; }
    table { width:100%; border-collapse:collapse; }
    th, td { font-size:13px; color:#d7d7d7; }
    th { text-align:left; color:#fff; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.08); }
  </style>
</head>
<body class="wrap">
  <div class="card">
    <div class="brand">
      <img src="${BRAND.baseUrl}/branding/logo.webp" alt="${escapeHtml(
    BRAND.name
  )}" width="48" height="48" />
    </div>
    <div class="title">${escapeHtml(title)}</div>
    <div class="body">
      ${body}
    </div>
    <div class="footer muted">
      <div class="divider"></div>
      © ${new Date().getFullYear()} ${escapeHtml(
    BRAND.name
  )} — All rights reserved.
    </div>
  </div>
</body>
</html>
`;
}

/* ----------------- templates ----------------- */

/**
 * Password reset email
 * @param {object} p
 * @param {string} [p.username]
 * @param {string} p.resetUrl
 */
function ResetPassword({ username, resetUrl }) {
  return layout({
    title: "Reset your password",
    body: `
      <p>Hey ${escapeHtml(username || "there")},</p>
      <p>We received a request to reset your password. Click the button below to continue (valid for 30 minutes):</p>
      <p style="text-align:center;margin:22px 0;">
        <a href="${resetUrl}" class="cta">Reset Password</a>
      </p>
      <p>If you didn’t request this, you can safely ignore this email.</p>
      <p class="muted">If the button doesn’t work, paste this link into your browser:<br/>
        <span style="word-break:break-all;">${escapeHtml(resetUrl)}</span>
      </p>
    `,
  });
}

/**
 * Newsletter / simple welcome
 * @param {object} p
 * @param {string} [p.username]
 * @param {string} [p.manageUrl]
 */
function NewsletterWelcome({ username, manageUrl }) {
  return layout({
    title: "Welcome to the Zone newsletter",
    body: `
      <p>Welcome ${escapeHtml(username || "")}!</p>
      <p>You’re in. Expect drops, giveaways, streams, and behind-the-scenes updates.</p>
      ${
        manageUrl
          ? `<p class="muted">Manage your preferences anytime: <a href="${manageUrl}">${escapeHtml(
              manageUrl
            )}</a></p>`
          : ""
      }
    `,
  });
}

/**
 * Subscription activated (single or multiple)
 * @param {object} p
 * @param {string} [p.username]
 * @param {Array<{niche_code:string,tier_type:string,valid_until:string|number|Date,price?:number}>} p.items
 * @param {string} [p.manageUrl]
 */
function SubscriptionActivated({ username, items, manageUrl }) {
  const list = (items || [])
    .map((it) => {
      const dateStr = it.valid_until
        ? new Date(it.valid_until).toLocaleDateString()
        : "-";
      const priceStr =
        typeof it.price === "number" ? `€${Number(it.price).toFixed(2)}` : "-";
      return `
        <tr>
          <td style="padding:8px 0;">${escapeHtml(
            String(it.niche_code || "-")
          )}</td>
          <td style="padding:8px 0;text-transform:capitalize;">${escapeHtml(
            String(it.tier_type || "-")
          )}</td>
          <td style="padding:8px 0;">${escapeHtml(dateStr)}</td>
          <td style="padding:8px 0;">${priceStr}</td>
        </tr>
      `;
    })
    .join("");

  return layout({
    title: "Your subscription is active",
    body: `
      <p>Hey ${escapeHtml(username || "member")},</p>
      <p>Your Zone subscription${
        (items || []).length > 1 ? "s are" : " is"
      } live. You now earn <strong>1.5× points</strong> on purchases.</p>
      <table style="margin:16px 0;">
        <thead>
          <tr>
            <th>Niche</th>
            <th>Tier</th>
            <th>Valid until</th>
            <th>Price</th>
          </tr>
        </thead>
        <tbody>${list}</tbody>
      </table>
      <p style="text-align:center;margin:22px 0;">
        <a class="cta" href="${
          (process.env.APP_BASE_URL || "http://localhost:3000") +
          "/account/subscriptions"
        }">Manage Subscriptions</a>
      </p>
      ${
        manageUrl
          ? `<p class="muted">Manage: <a href="${manageUrl}">${escapeHtml(
              manageUrl
            )}</a></p>`
          : ""
      }
    `,
  });
}

/**
 * Generic wrapper (useful for quick transactional messages)
 * @param {object} p
 * @param {string} p.title
 * @param {string} p.html - inner HTML content
 */
function Generic({ title, html }) {
  return layout({ title, body: html });
}

module.exports = {
  ResetPassword,
  NewsletterWelcome,
  SubscriptionActivated,
  Generic,
};
