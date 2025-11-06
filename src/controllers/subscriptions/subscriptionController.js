//

const pool = require("../../config/db");
const { v4: uuidv4 } = require("uuid");
const { sendEmail } = require("../../services/email/emailService");
const { SubscriptionActivated } = require("../../services/email/templates");

/* ------------------------- normalization helpers ------------------------- */

const NICHE_MAP = {
  // OtakuSquad
  otaku: "otaku",
  otakusquad: "otaku",
  "otaku squad": "otaku",

  // ᛋᛏᛟᛁᚲ (StoikrClub)
  stoikr: "stoikr",
  stoikrclub: "stoikr",
  "stoikr club": "stoikr",

  // WD Crew
  wd: "wd",
  wdcrew: "wd",
  "wd crew": "wd",

  // PerOs Pack
  peros: "peros",
  perospack: "peros",
  "peros pack": "peros",

  // CritHit Team
  crithit: "crithit",
  crithitteam: "crithit",
  "crit hit team": "crithit",

  // The Grid Opus
  grid: "grid",
  thegridopus: "grid",
  "the grid opus": "grid",

  // The Syndicate
  syndicate: "syndicate",
  thesyndicate: "syndicate",
  "the syndicate": "syndicate",
};

function normalizeNicheCode(input) {
  const key = String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "");
  return NICHE_MAP[key] || null;
}

const TIER_MAP = {
  monthly: "monthly",
  month: "monthly",
  "1m": "monthly",
  quarterly: "quarterly",
  quarter: "quarterly",
  "3m": "quarterly",
  "half-yearly": "half-yearly",
  halfyearly: "half-yearly",
  "6m": "half-yearly",
  "half yearly": "half-yearly",
  yearly: "yearly",
  annual: "yearly",
  year: "yearly",
  "12m": "yearly",
};

function normalizeTierType(input) {
  const key = String(input || "")
    .toLowerCase()
    .trim();
  return TIER_MAP[key] || null;
}

/* ------------------------------- utilities ------------------------------- */

async function fetchUserById(userId) {
  const { rows } = await pool.query(
    `SELECT user_id, username, email FROM public.users WHERE user_id = $1`,
    [userId]
  );
  return rows[0] || null;
}

/* ------------------------------ controllers ------------------------------ */

// ▪️ Get all active subscriptions for the logged-in user
const getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { rows } = await pool.query(
      `
      SELECT
        us.id,
        us.niche_code,
        us.tier_type,
        us.start_date,
        us.end_date,
        sp.price,
        sp.discount_percentage,
        sp.points_multiplier
      FROM public.user_subscriptions us
      LEFT JOIN public.subscription_plans sp
        ON sp.niche_code = us.niche_code
       AND sp.tier_type  = us.tier_type
      WHERE us.user_id = $1
        AND us.is_active = true
        AND us.end_date  > CURRENT_TIMESTAMP
      ORDER BY us.start_date DESC
      `,
      [userId]
    );

    return res.status(200).json({
      active_subscriptions: rows,
      total: rows.length,
    });
  } catch (err) {
    console.error("Get Subscriptions Error:", err.message);
    return res.status(500).json({ message: "Server error" });
  }
};

// ▪️ Subscribe to one or multiple niches
const subscribeToNiches = async (req, res) => {
  const userId = req.user.userId;
  const { subscriptions } = req.body;

  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return res
      .status(400)
      .json({ message: "At least one subscription is required." });
  }

  const results = [];

  try {
    for (const sub of subscriptions) {
      const rawNiche = sub?.niche_code;
      const rawTier = sub?.tier_type;

      const niche_code = normalizeNicheCode(rawNiche);
      const tier_type = normalizeTierType(rawTier);

      if (!niche_code) {
        results.push({ niche_code: rawNiche, status: "unknown_niche" });
        continue;
      }
      if (!tier_type) {
        results.push({ niche_code, status: "invalid_duration" });
        continue;
      }

      // 1) already active?
      const existing = await pool.query(
        `
        SELECT 1
        FROM public.user_subscriptions
        WHERE user_id = $1
          AND niche_code = $2
          AND is_active  = true
          AND end_date   > CURRENT_TIMESTAMP
        LIMIT 1
        `,
        [userId, niche_code]
      );
      if (existing.rows.length > 0) {
        results.push({ niche_code, status: "already_subscribed" });
        continue;
      }

      // 2) plan lookup (must exist)
      const planRes = await pool.query(
        `
        SELECT niche_code, tier_type, price, discount_percentage, points_multiplier
        FROM public.subscription_plans
        WHERE niche_code = $1 AND tier_type = $2
        `,
        [niche_code, tier_type]
      );
      if (planRes.rows.length === 0) {
        // Helpful log when seeding/pointing at wrong DB
        console.warn("[subscribe] plan not found:", { niche_code, tier_type });
        results.push({ niche_code, status: "invalid_plan" });
        continue;
      }
      const plan = planRes.rows[0];

      // 3) dates
      const startDate = new Date();
      const endDate = new Date(startDate);
      switch (tier_type) {
        case "monthly":
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case "quarterly":
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case "half-yearly":
          endDate.setMonth(endDate.getMonth() + 6);
          break;
        case "yearly":
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          results.push({ niche_code, status: "invalid_duration" });
          continue;
      }

      // 4) insert
      await pool.query(
        `
        INSERT INTO public.user_subscriptions
          (id, user_id, niche_code, tier_type, start_date, end_date, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, true)
        `,
        [uuidv4(), userId, niche_code, tier_type, startDate, endDate]
      );

      results.push({
        niche_code,
        status: "subscribed",
        tier_type,
        price: plan.price,
        discount_percentage: plan.discount_percentage,
        points_multiplier: plan.points_multiplier,
        valid_until: endDate.toISOString(),
      });
    }

    // 5) email for newly-subscribed (non-blocking)
    const newItems = results.filter((r) => r.status === "subscribed");
    if (newItems.length > 0) {
      (async () => {
        try {
          const user = await fetchUserById(userId);
          if (user?.email) {
            const html = SubscriptionActivated({
              username: user.username,
              items: newItems,
              manageUrl:
                (process.env.APP_BASE_URL || "http://localhost:3000") +
                "/account/subscriptions",
            });

            await sendEmail({
              to: user.email,
              subject: "Your subscription is active",
              html,
              text: `Hi ${user.username}, your subscription(s) are active.`,
              category: "subscription_activated",
              meta: { count: newItems.length },
            });
          }
        } catch (mailErr) {
          console.error("[subscriptions] email send failed:", mailErr.message);
          // do not fail the API call if email fails
        }
      })();
    }

    return res.status(200).json({
      message: "Subscription request processed.",
      results,
    });
  } catch (err) {
    console.error("Subscribe Error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ▪️ Remove subscription (mark as inactive)
const removeSubscription = async (req, res) => {
  const { subscriptionId } = req.params;
  const userId = req.user.userId;

  try {
    const { rows } = await pool.query(
      `
      SELECT id, start_date, end_date
      FROM public.user_subscriptions
      WHERE id = $1 AND user_id = $2 AND is_active = true
      `,
      [subscriptionId, userId]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Subscription not found or already inactive." });
    }

    await pool.query(
      `
      UPDATE public.user_subscriptions
      SET is_active = false, end_date = CURRENT_TIMESTAMP
      WHERE id = $1
      `,
      [subscriptionId]
    );

    return res
      .status(200)
      .json({ message: "Subscription canceled successfully." });
  } catch (err) {
    console.error("Remove Subscription Error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ▪️ Remove subscription (mark as inactive with cancellation policy)
const removeSubscriptionWithPolicy = async (req, res) => {
  const { subscriptionId } = req.params;
  const userId = req.user.userId;

  try {
    const { rows } = await pool.query(
      `
      SELECT us.*, sp.price
      FROM public.user_subscriptions us
      LEFT JOIN public.subscription_plans sp
        ON sp.niche_code = us.niche_code
       AND sp.tier_type  = us.tier_type
      WHERE us.id = $1 AND us.user_id = $2 AND us.is_active = true
      `,
      [subscriptionId, userId]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Subscription not found or already inactive." });
    }

    const subscription = rows[0];
    const startDate = new Date(subscription.start_date);
    const currentDate = new Date();
    const totalMs = new Date(subscription.end_date) - startDate;
    const leftMs = new Date(subscription.end_date) - currentDate;

    const cancelMidTermAllowed = true;
    let refundAmount = 0;

    if (cancelMidTermAllowed) {
      const totalDays = Math.max(1, totalMs / 86400000);
      const daysRemaining = Math.max(0, leftMs / 86400000);
      const price = Number(subscription.price || 0);
      refundAmount = price > 0 ? (price * daysRemaining) / totalDays : 0;

      await pool.query(
        `
        UPDATE public.user_subscriptions
        SET is_active = false, end_date = CURRENT_TIMESTAMP
        WHERE id = $1
        `,
        [subscriptionId]
      );
    } else {
      return res.status(400).json({
        message: "Mid-term cancellation not allowed for this subscription.",
      });
    }

    return res.status(200).json({
      message: `Subscription canceled successfully. Refund amount: ${refundAmount.toFixed(
        2
      )}.`,
      refundAmount,
    });
  } catch (err) {
    console.error("Remove Subscription Error:", err.message);
    return res.status(500).json({ message: "Server error." });
  }
};

// ▪️ Dev/test: send subscription email without DB writes
const testSubscriptionEmail = async (req, res) => {
  try {
    const user = await fetchUserById(req.user.userId);
    if (!user?.email)
      return res.status(400).json({ message: "User email not found" });

    const items = req.body.items || [
      {
        niche_code: "otaku",
        tier_type: "monthly",
        valid_until: new Date(Date.now() + 30 * 864e5),
        price: 12,
      },
    ];

    const html = SubscriptionActivated({
      username: user.username,
      items,
      manageUrl:
        (process.env.APP_BASE_URL || "http://localhost:3000") +
        "/account/subscriptions",
    });

    const { providerMessageId } = await sendEmail({
      to: user.email,
      subject: "Your subscription is active",
      html,
      text: `Hi ${user.username}, your subscription(s) are active.`,
      category: "subscription_activated",
      meta: { count: items.length },
    });

    return res.status(200).json({ ok: true, providerMessageId });
  } catch (e) {
    console.error("[testSubscriptionEmail]", e);
    return res.status(500).json({ ok: false, error: e.message });
  }
};

module.exports = {
  getUserSubscriptions,
  subscribeToNiches,
  removeSubscription,
  removeSubscriptionWithPolicy,
  testSubscriptionEmail,
};
