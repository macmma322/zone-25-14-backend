const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

async function sendVerificationEmail(userEmail, verificationToken) {
  const mailOptions = {
    from: "noreply@zone25.com",
    to: userEmail,
    subject: "Verify Your Email",
    html: `<p>Click <a href="http://localhost:5000/api/auth/verify-email?token=${verificationToken}">here</a> to verify your email.</p>`,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { sendVerificationEmail };
