// zone-25-14-backend/src/services/email/emailService.js
// High-level email service
// Functions: sendEmail(opts)
// Usage: const { sendEmail } = require('./services/email/emailService');
//        await sendEmail({ to, subject, html, text, category, meta });
const { send } = require("./transport");

async function sendEmail(opts) {
  // ...
  const { providerMessageId, previewUrl } = await send({ ...opts });
  // ... update outbox, etc.
  return { providerMessageId, previewUrl }; // <- keep it
}
