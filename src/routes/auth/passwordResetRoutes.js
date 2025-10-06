// src/routes/auth/passwordResetRoutes.js
// Routes for password reset: request reset and perform reset
// Functions: POST /forgot, POST /reset
// Dependencies: express, passwordResetController
const router = require("express").Router();
const ctrl = require("../../controllers/auth/passwordResetController");
// You can add a rate limit per-IP here too if you want.

router.post("/forgot", ctrl.requestReset);
router.post("/reset", ctrl.performReset);

module.exports = router;
