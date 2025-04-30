const pool = require("../../config/db");
const { v4: uuidv4 } = require("uuid");

// ▪️ Get all active subscriptions for logged-in user
exports.getUserSubscriptions = async (req, res) => {
    try {
      const userId = req.user.userId;
  
      const { rows } = await pool.query(
        `SELECT niche_code, tier_type, start_date, end_date
         FROM user_subscriptions
         WHERE user_id = $1 AND is_active = true AND end_date > CURRENT_TIMESTAMP`,
        [userId]
      );
  
      res.status(200).json({
        active_subscriptions: rows,
        total: rows.length
      });
  
    } catch (err) {
      console.error('Get Subscriptions Error:', err.message);
      res.status(500).json({ message: 'Server error' });
    }
  };
  
// ▪️ Subscribe to one or multiple niches
exports.subscribeToNiches = async (req, res) => {
  const userId = req.user.userId;
  const { subscriptions } = req.body;

  /*
    subscriptions = [
      { niche_code: 'OtakuSquad', tier_type: 'monthly' },
      { niche_code: 'StoikrClub', tier_type: 'quarterly' }
    ]
  */

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
        `SELECT * FROM user_subscriptions
         WHERE user_id = $1 AND niche_code = $2 AND is_active = true AND end_date > CURRENT_TIMESTAMP`,
        [userId, niche_code]
      );

      if (existing.rows.length > 0) {
        results.push({
          niche_code,
          status: "already_subscribed",
        });
        continue;
      }

      // 2️⃣ Get plan details from subscription_plans
      const planRes = await pool.query(
        `SELECT * FROM subscription_plans
         WHERE niche_code = $1 AND tier_type = $2`,
        [niche_code, tier_type]
      );

      if (planRes.rows.length === 0) {
        results.push({
          niche_code,
          status: "invalid_plan",
        });
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
          results.push({
            niche_code,
            status: "invalid_duration",
          });
          continue;
      }

      // 4️⃣ Insert subscription
      await pool.query(
        `INSERT INTO user_subscriptions (id, user_id, niche_code, tier_type, start_date, end_date, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [uuidv4(), userId, niche_code, tier_type, startDate, endDate]
      );

      results.push({
        niche_code,
        status: "subscribed",
        tier_type,
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
