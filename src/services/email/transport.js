// zone-25-14-backend/src/services/email/transport.js
// Low-level email transport
// Functions: send(opts)
// Usage: const { send } = require('./services/email/transport');
//        await send({ to, subject, html, text, headers });
const nodemailer = require("nodemailer");
const provider = process.env.EMAIL_PROVIDER || "smtp";

const FROM = {
  name: process.env.EMAIL_FROM_NAME || "Zone 25-14",
  email: process.env.EMAIL_FROM_ADDR || "your.gmail@gmail.com",
};

let smtp;

async function getTransport() {
  if (!smtp) {
    smtp = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465, // true for 465, false for 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return smtp;
}

async function send({ to, subject, html, text, headers }) {
  const transporter = await getTransport();
  const info = await transporter.sendMail({
    from: `"${FROM.name}" <${FROM.email}>`,
    to,
    subject,
    html,
    text,
    headers,
  });
  return { providerMessageId: info.messageId, previewUrl: null };
}

module.exports = { send, provider };
