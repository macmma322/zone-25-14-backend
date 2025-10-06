// Description: Routes for newsletter subscription, dismissal, and status
// Functions: POST /subscribe, POST /dismiss, POST /status, GET /unsubscribe, POST /webhook/sendgrid
// Dependencies: express, auth middleware, rate limiting middleware, newsletter controller
// File: src/routes/newsletter/newsletterRoutes.js
// File: src/routes/newsletter/newsletterRoutes.js
const router = require("express").Router();
const { requireAuthOptional } = require("../../middleware/authMiddleware");
const ctrl = require("../../controllers/newsletter/newsletterController");
const rate = require("../../middleware/rateLimit"); // ✅ now exists

router.post(
  "/subscribe",
  rate({ windowMs: 15 * 60 * 1000, max: 20 }), // ✅ route-level throttle
  requireAuthOptional,
  ctrl.subscribe
);

router.post("/dismiss", requireAuthOptional, ctrl.dismiss);
router.post("/status", requireAuthOptional, ctrl.status);

router.get("/unsubscribe", ctrl.unsubscribe);
router.post("/webhook/sendgrid", ctrl.sgWebhook);

module.exports = router;
