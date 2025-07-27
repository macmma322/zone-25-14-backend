// File: zone-25-14-backend/src/controllers/users/accountsController.js
// This file contains the controller functions for managing user social links.
// It handles retrieving and updating social links for users.

const pool = require("../../config/db");

// ✅ Get all linked accounts and social links for the logged-in user
const getUserAccounts = async (req, res) => {
  const userId = req.user.user_id;

  try {
    // Fetch linked accounts
    const linkedAccountsResult = await pool.query(
      `SELECT provider, provider_user_id, profile_url, avatar_url, linked_at
       FROM user_linked_accounts
       WHERE user_id = $1`,
      [userId]
    );

    // Fetch social links
    const socialLinksResult = await pool.query(
      `SELECT instagram, youtube, twitch, twitter, website
       FROM user_socials WHERE user_id = $1`,
      [userId]
    );

    res.status(200).json({
      linked_accounts: linkedAccountsResult.rows,
      social_links: socialLinksResult.rows[0] || {},
    });
  } catch (err) {
    console.error("❌ Get User Accounts Error:", err.message);
    res.status(500).json({ message: "Failed to fetch accounts." });
  }
};

// ✅ Link an external account
const linkExternalAccount = async (req, res) => {
  const userId = req.user.user_id;
  const { provider, provider_user_id, profile_url, avatar_url } = req.body;

  if (!provider || !provider_user_id) {
    return res.status(400).json({ message: "Missing provider or ID." });
  }

  try {
    await pool.query(
      `INSERT INTO user_linked_accounts (user_id, provider, provider_user_id, profile_url, avatar_url)
       VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
      [userId, provider, provider_user_id, profile_url, avatar_url]
    );

    res.status(200).json({ message: "Account linked successfully." });
  } catch (err) {
    console.error("❌ Link External Account Error:", err.message);
    res.status(500).json({ message: "Failed to link account." });
  }
};

// ✅ Update or insert social links
const updateSocialLinks = async (req, res) => {
  const userId = req.user.user_id;
  const { instagram, youtube, twitch, twitter, website } = req.body;

  try {
    await pool.query(
      `INSERT INTO user_socials (user_id, instagram, youtube, twitch, twitter, website)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id) DO UPDATE
       SET instagram = EXCLUDED.instagram,
           youtube = EXCLUDED.youtube,
           twitch = EXCLUDED.twitch,
           twitter = EXCLUDED.twitter,
           website = EXCLUDED.website`,
      [userId, instagram, youtube, twitch, twitter, website]
    );

    res.status(200).json({ message: "Social links updated successfully." });
  } catch (err) {
    console.error("❌ Update Social Links Error:", err.message);
    res.status(500).json({ message: "Server error." });
  }
};

// ✅ Unlink an external account
const unlinkExternalAccount = async (req, res) => {
  const userId = req.user.user_id;
  const { provider } = req.params;

  try {
    await pool.query(
      `DELETE FROM user_linked_accounts
       WHERE user_id = $1 AND provider = $2`,
      [userId, provider]
    );

    res.status(200).json({ message: "Account unlinked." });
  } catch (err) {
    console.error("❌ Unlink External Account Error:", err.message);
    res.status(500).json({ message: "Failed to unlink account." });
  }
};

// ✅ Get only social links for the logged-in user
const getOnlySocialLinks = async (req, res) => {
  const userId = req.user.user_id;

  try {
    const socialLinksResult = await pool.query(
      `SELECT instagram, youtube, twitch, twitter, website
       FROM user_socials WHERE user_id = $1`,
      [userId]
    );

    res.status(200).json(socialLinksResult.rows[0] || {});
  } catch (err) {
    console.error("❌ Get Only Social Links Error:", err.message);
    res.status(500).json({ message: "Failed to fetch social links." });
  }
};

module.exports = {
  getUserAccounts,
  linkExternalAccount,
  updateSocialLinks,
  unlinkExternalAccount,
  getOnlySocialLinks,
};
