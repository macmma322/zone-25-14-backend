// File: src/utils/notificationHelpers.js
// Description: Helpers to generate consistent notification messages & secondary info.
// Exports: getDefaultNotificationContent(type, data), generateAdditionalInfo(type, data), safeSnippet

/** @typedef {"message"|"reply"|"friend"|"reaction"|"order"|"event"|"stream"|"announcement"|"giveaway"|"donation"|"achievement"} NotificationType */

/**
 * Consistent payload we attach to notifications as the "data" field.
 * Always include deep-link identifiers when you can (e.g., conversation_id, order_id).
 * @typedef {Object} NotificationData
 * @property {NotificationType} kind
 * @property {string} [conversation_id]
 * @property {string} [message_id]
 * @property {boolean} [isGroup]
 * @property {string} [groupName]
 * @property {string} [orderId]
 * @property {string} [status]
 * @property {string} [eventId]
 * @property {string} [eventName]
 * @property {string} [streamId]
 * @property {string} [streamerName]
 * @property {string} [title]              // announcement/achievement/giveaway title
 * @property {number|string} [amount]      // donations
 * @property {string} [currency]           // donations
 * @property {string[]} [mutualFriends]    // friend request preview
 * @property {string} [nickname]           // friend request alias
 * @property {string} [preview]            // message preview text
 * @property {string} [emoji]              // reaction emoji
 * @property {string} [targetSnippet]      // reaction target short text
 * @property {string} [deliveryETA]        // order ETA text
 * @property {string} [countdown]          // stream countdown text
 * @property {string} [senderName]         // generic sender display name
 */

/** Max characters for secondary-line snippets */
const MAX_SNIPPET = 80;

/**
 * Normalize a snippet: collapse whitespace, trim, cap length, add an ellipsis if needed.
 * @param {string} [s]
 * @param {number} [maxLen]
 * @returns {string}
 */
function safeSnippet(s = "", maxLen = MAX_SNIPPET) {
  const flat = String(s).replace(/\s+/g, " ").trim();
  if (!flat) return "";
  return flat.length > maxLen
    ? flat.slice(0, maxLen - 1).trimEnd() + "…"
    : flat;
}

/**
 * Small currency formatter for donation/order amounts (string fallback if Intl not available).
 * @param {number|string} amount
 * @param {string} [currency="USD"]
 * @returns {string}
 */
function formatCurrency(amount, currency = "USD") {
  const num = Number(amount);
  if (!Number.isFinite(num)) return String(amount ?? "");
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${num.toFixed(2)} ${currency}`;
  }
}

/**
 * Generate the primary notification text.
 * This is the short line shown as the main message.
 * @param {NotificationType} type
 * @param {Partial<NotificationData>} data
 * @returns {string}
 */
function getDefaultNotificationContent(type, data = {}) {
  const sender = data.senderName || "Someone";

  switch (type) {
    case "message": {
      // If group context is present, make it explicit
      if (data.isGroup && data.groupName) {
        return `${sender} sent a message to ${data.groupName}.`;
      }
      return `${sender} sent you a message.`;
    }

    case "reply":
      return `${sender} replied to your message.`;

    case "friend":
      return `${sender} sent you a friend request.`;

    case "reaction":
      return `${sender} reacted to your message.`;

    case "order": {
      const id = data.orderId || "XXXX";
      const status = data.status || "updated";
      return `Your order #${id} has been ${status}.`;
    }

    case "event":
      return `New event: ${data.eventName || "Untitled Event"} is coming up!`;

    case "stream":
      return `${data.streamerName || "A streamer"} is now live!`;

    case "announcement":
      return `New announcement: ${data.title || "Important update"}.`;

    case "giveaway":
      return `Giveaway alert: ${
        data.title || data.giveawayName || "Check it out now!"
      }`;

    case "donation": {
      const amount =
        data.amount != null
          ? formatCurrency(data.amount, data.currency || "USD")
          : "$0.00";
      return `Thank you for donating ${amount} to support Zone 32-19.`;
    }

    case "achievement":
      return data.title
        ? `🔥 ${data.title}`
        : "You unlocked a new achievement!";
    case "mention":
      return `${sender} mentioned you in a comment.`;

    default:
      return "You have a new notification.";
  }
}

/**
 * Generate an optional secondary line (subtext) with contextual details.
 * Keep it short and sanitized — it’s shown as a subtitle or tooltip.
 * @param {NotificationType} type
 * @param {Partial<NotificationData>} data
 * @returns {string|undefined}
 */
function generateAdditionalInfo(type, data = {}) {
  switch (type) {
    case "message": {
      const sender = data.senderName || "Someone";
      const isGroup = data.isGroup && data.groupName;

      // Check for media types
      if (data.media_type) {
        let mediaText = "a message";
        if (data.media_type.startsWith("image")) mediaText = "an image";
        else if (data.media_type.startsWith("video")) mediaText = "a video";
        else if (data.media_type.startsWith("audio"))
          mediaText = "an audio clip";
        else if (data.media_type.includes("gif")) mediaText = "a GIF";

        if (isGroup) return `${sender} sent ${mediaText} in ${data.groupName}.`;
        return `${sender} sent you ${mediaText}.`;
      }

      // Default text message
      return isGroup
        ? `${sender} sent a message in ${data.groupName}.`
        : `${sender} sent you a message.`;
    }

    case "reply": {
      const sender = data.senderName || "Someone";
      if (data.media_type) {
        if (data.media_type.startsWith("image"))
          return `${sender} replied with an image.`;
        if (data.media_type.startsWith("video"))
          return `${sender} replied with a video.`;
        if (data.media_type.startsWith("audio"))
          return `${sender} replied with an audio clip.`;
      }
      return `${sender} replied to your message.`;
    }

    case "friend": {
      const { nickname, senderName, mutualFriends } = data;
      const isCustomName = nickname && nickname !== senderName;
      const base = isCustomName ? `From: ${nickname}` : null;

      if (Array.isArray(mutualFriends) && mutualFriends.length > 0) {
        const previewList = mutualFriends.slice(0, 3).join(", ");
        const moreCount = mutualFriends.length - 3;
        const moreText = moreCount > 0 ? ` +${moreCount} more` : "";
        const mutual = `Mutual friends: ${previewList}${moreText}`;
        return base ? `${base} • ${mutual}` : mutual;
      }
      return base || undefined;
    }

    case "reaction": {
      const tgt = data.targetSnippet ? safeSnippet(data.targetSnippet) : "";
      if (data.emoji && tgt) return `${data.emoji} on: "${tgt}"`;
      if (tgt) return `On: "${tgt}"`;
      return undefined;
    }

    case "order": {
      if (data.status) return `Status: ${data.status}`;
      if (data.deliveryETA) return `Expected delivery: ${data.deliveryETA}`;
      return undefined;
    }

    case "giveaway":
      return data.title ? `Giveaway: ${safeSnippet(data.title)}` : undefined;

    case "stream": {
      const parts = [];
      if (data.eventName) parts.push(`Event: ${safeSnippet(data.eventName)}`);
      if (data.countdown)
        parts.push(`Goes live in: ${safeSnippet(data.countdown, 40)}`);
      return parts.length ? parts.join(" • ") : undefined;
    }

    case "announcement":
      return data.title ? safeSnippet(data.title) : undefined;

    case "achievement":
      return data.title ? `Unlocked: ${safeSnippet(data.title)}` : undefined;

    case "mention": {
      const { eventTitle, commentSnippet } = data;
      if (commentSnippet) {
        return `In ${eventTitle || "an event"}: "${safeSnippet(
          commentSnippet
        )}"`;
      }
      return eventTitle ? `In event: ${safeSnippet(eventTitle)}` : undefined;
    }

    default:
      return undefined;
  }
}

module.exports = {
  getDefaultNotificationContent,
  generateAdditionalInfo,
  safeSnippet,
};
