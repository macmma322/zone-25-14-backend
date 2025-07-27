const pool = require("../../config/db");
const { v4: uuidv4 } = require("uuid");

// ▪️ Get all active subscriptions for the logged-in user
const getUserSubscriptions = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { rows } = await pool.query(
      `
        SELECT us.niche_code, us.tier_type, us.start_date, us.end_date, 
               sp.price, sp.discount_percentage, sp.points_multiplier
        FROM public.user_subscriptions us
        LEFT JOIN public.subscription_plans sp ON us.niche_code = sp.niche_code AND us.tier_type = sp.tier_type
        WHERE us.user_id = $1 AND us.is_active = true AND us.end_date > CURRENT_TIMESTAMP
      `,
      [userId]
    );

    res.status(200).json({
      active_subscriptions: rows,
      total: rows.length,
    });
  } catch (err) {
    console.error("Get Subscriptions Error:", err.message);
    res.status(500).json({ message: "Server error" });
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

      // 3️⃣ Calculate end_date based on tier_type
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
        price: plan.price,
        discount_percentage: plan.discount_percentage,
        points_multiplier: plan.points_multiplier,
        valid_until: endDate.toISOString(),
      });
    }

    res.status(200).json({
      message: "Subscription request processed.",
      results,
    });
  } catch (err) {
    console.error("Subscribe Error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ▪️ Remove subscription (mark as inactive)
const removeSubscription = async (req, res) => {
  const { subscriptionId } = req.params; // The subscription ID to be canceled
  const userId = req.user.userId; // Logged-in user ID

  try {
    // 1️⃣ Check if the subscription exists and belongs to the logged-in user
    const { rows } = await pool.query(
      `SELECT * FROM public.user_subscriptions
       WHERE id = $1 AND user_id = $2 AND is_active = true`,
      [subscriptionId, userId]
    );

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Subscription not found or already inactive." });
    }

    // 2️⃣ Mark subscription as inactive by updating is_active to false
    await pool.query(
      `UPDATE public.user_subscriptions
       SET is_active = false, end_date = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [subscriptionId]
    );

    res.status(200).json({
      message: "Subscription canceled successfully.",
    });
  } catch (err) {
    console.error("Remove Subscription Error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ▪️ Remove subscription (mark as inactive with cancellation policy)
const removeSubscriptionWithPolicy = async (req, res) => {
  const { subscriptionId } = req.params;
  const userId = req.user.userId;

  try {
    // 1️⃣ Check if the subscription exists and belongs to the logged-in user
    const { rows } = await pool.query(
      `SELECT * FROM public.user_subscriptions
       WHERE id = $1 AND user_id = $2 AND is_active = true`,
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

    // 2️⃣ Business logic: Check if cancellations are allowed mid-term
    const cancelMidTermAllowed = true; // Can be controlled by business rules, e.g. subscription type
    let refundAmount = 0;

    if (cancelMidTermAllowed) {
      // Calculate the prorated refund based on the days left in the subscription period
      const totalSubscriptionDays =
        (new Date(subscription.end_date) - startDate) / (1000 * 60 * 60 * 24);
      const daysRemaining =
        (new Date(subscription.end_date) - currentDate) / (1000 * 60 * 60 * 24);
      refundAmount =
        (subscription.price * daysRemaining) / totalSubscriptionDays; // Prorated refund

      // Adjust end date
      await pool.query(
        `UPDATE public.user_subscriptions
         SET is_active = false, end_date = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [subscriptionId]
      );
    } else {
      return res.status(400).json({
        message: "Mid-term cancellation not allowed for this subscription.",
      });
    }

    res.status(200).json({
      message: `Subscription canceled successfully. Refund amount: ${refundAmount.toFixed(
        2
      )}.`,
      refundAmount,
    });
  } catch (err) {
    console.error("Remove Subscription Error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = {
  getUserSubscriptions,
  subscribeToNiches,
  removeSubscription,
  removeSubscriptionWithPolicy,
};
