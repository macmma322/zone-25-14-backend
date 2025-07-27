// File: src/jobs/expirationNotifications.js
// This file contains a cron job that checks for subscriptions
// expiring within the next 7 days and sends email notifications to users.

const cron = require("node-cron");
const pool = require("../config/db");
const nodemailer = require("nodemailer"); // Use Nodemailer for sending emails

// Create a cron job that runs every day at midnight
cron.schedule("0 0 * * *", async () => {
  try {
    const currentDate = new Date();
    const upcomingExpiryDate = new Date(currentDate);
    upcomingExpiryDate.setDate(currentDate.getDate() + 7); // Check for subscriptions expiring in the next 7 days

    // Query for subscriptions expiring within 7 days
    const { rows } = await pool.query(
      `SELECT us.user_id, us.niche_code, us.end_date, u.email
       FROM public.user_subscriptions us
       JOIN public.users u ON us.user_id = u.user_id
       WHERE us.is_active = true AND us.end_date <= $1 AND us.end_date > $2`,
      [upcomingExpiryDate, currentDate]
    );

    rows.forEach((subscription) => {
      const { user_id, niche_code, end_date, email } = subscription;
      const transporter = nodemailer.createTransport({
        service: "gmail", // Use any email service provider
        auth: {
          user: "Fill in email ",
          pass: "Fill in password ",
        },
      });

      const mailOptions = {
        from: "Fill in email ",
        to: email,
        subject: "Your subscription is about to expire",
        text: `Hello, your subscription to the "${niche_code}" niche will expire on ${end_date}. Please renew your subscription soon to avoid any interruptions.`,
      };

      // Send email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error("Error sending email:", error);
        } else {
          console.log("Expiration notification sent to:", email);
        }
      });
    });
  } catch (err) {
    console.error("Error checking subscription expirations:", err.message);
  }
});
