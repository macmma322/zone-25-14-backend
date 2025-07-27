// File: src/services/subscriptions/subscriptionService.js
// This file contains the business logic for handling subscriptions
// It includes functions for subscribing to niches, checking existing subscriptions,
// and managing user subscriptions.

const pool = require("../../config/db");

// Prices for bundles
const bundlePrices = {
  2: 20, // $20 for 2 niches
  3: 31, // $31 for 3 niches
  5: 50, // $50 for 5 niches
  7: 70, // $70 for 7 niches
};

// Get the bundle price for a specific number of niches
const getBundlePrice = (nichesCount) => {
  return bundlePrices[nichesCount] || nichesCount * 12; // Default price for single niches
};

// ▪️ Subscribe to Multiple Niches (with Bundle Pricing)
const subscribeToNiches = async (userId, subscriptions) => {
  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    throw new Error("At least one subscription is required.");
  }

  const results = [];
  const nichesCount = subscriptions.length;

  // Validate bundles
  if (![2, 3, 5, 7].includes(nichesCount)) {
    throw new Error("Only bundles of 2, 3, 5, or 7 niches are allowed.");
  }

  const totalPrice = getBundlePrice(nichesCount); // Calculate the total price based on the bundle

  try {
    for (const sub of subscriptions) {
      const { niche_code, tier_type } = sub;

      // 1️⃣ Check if user already subscribed to this niche
      const existing = await pool.query(
        `
          SELECT * FROM public.user_subscriptions
          WHERE user_id = $1 AND niche_code = $2 AND is_active = true AND end_date > CURRENT_TIMESTAMP
        `,
        [userId, niche_code]
      );

      if (existing.rows.length > 0) {
        results.push({ niche_code, status: "already_subscribed" });
        continue;
      }

      // 2️⃣ Get plan details from subscription_plans
      const planRes = await pool.query(
        `SELECT * FROM public.subscription_plans WHERE niche_code = $1 AND tier_type = $2`,
        [niche_code, tier_type]
      );

      if (planRes.rows.length === 0) {
        results.push({ niche_code, status: "invalid_plan" });
        continue;
      }

      const plan = planRes.rows[0];

      // 3️⃣ Calculate the end date based on tier type
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

      // 4️⃣ Insert subscription into user_subscriptions
      await pool.query(
        `
          INSERT INTO public.user_subscriptions (id, user_id, niche_code, tier_type, start_date, end_date, is_active)
          VALUES ($1, $2, $3, $4, $5, $6, true)
        `,
        [uuidv4(), userId, niche_code, tier_type, startDate, endDate]
      );

      results.push({
        niche_code,
        status: "subscribed",
        tier_type,
        valid_until: endDate.toISOString(),
        price: plan.price,
      });
    }

    return {
      totalPrice, // Return the total price for the bundle
      results,
    };
  } catch (err) {
    console.error("Subscribe Error:", err.message);
    throw new Error("Server error.");
  }
};

module.exports = {
  subscribeToNiches,
};
