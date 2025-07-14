// File: src/utils/notificationHelpers.js
// Description: Utility to auto-generate default notification messages by type
// Used when no custom content is provided
const NotificationTypes = require("../models/notificationModel.js");

const getDefaultNotificationContent = (type, data = {}) => {
  switch (type) {
    case "message":
      return `${data.senderName || "Someone"} sent you a message.`;

    case "friend":
      return `${data.senderName || "Someone"} sent you a friend request.`;

    case "reaction":
      return `${data.senderName || "Someone"} reacted to your message.`;

    case "reply":
      return `${data.senderName || "Someone"} replied to your message.`;

    case "order":
      return `Your order #${data.orderId || "XXXX"} has been ${
        data.status || "updated"
      }.`;

    case "event":
      return `New event: ${data.eventName || "Untitled Event"} is coming up!`;

    case "stream":
      return `${data.streamerName || "A streamer"} is now live!`;

    case "announcement":
      return `New announcement: ${data.title || "Important update"}.`;

    case "giveaway":
      return `Giveaway alert: ${data.giveawayName || "Check it out now!"}`;

    case "donation":
      return `Thank you for donating ${
        data.amount || "$0.00"
      } to support Zone 25-14.`;

    default:
      return "You have a new notification.";
  }
};

function generateAdditionalInfo(type, data = {}) {
  switch (type) {
    case "message":
      return data.preview ? `Preview: ${data.preview}` : undefined;

    case "friend":
      const { nickname, senderName, mutualFriends } = data;
      const isCustomName = nickname && nickname !== senderName;

      let base = isCustomName ? `From: ${nickname}` : null;

      if (Array.isArray(mutualFriends) && mutualFriends.length > 0) {
        const previewList = mutualFriends.slice(0, 3).join(", ");
        const moreCount = mutualFriends.length - 3;
        const moreText = moreCount > 0 ? ` +${moreCount} more` : "";
        const mutual = `Mutual friends: ${previewList}${moreText}`;

        return base ? `${base} • ${mutual}` : mutual;
      }

      return base || undefined;

    case "order":
      if (data.status) return `Status: ${data.status}`;
      if (data.deliveryETA) return `Expected delivery: ${data.deliveryETA}`;
      return undefined;

    case "giveaway":
      return data.reward ? `Reward: ${data.reward}` : undefined;

    case "stream":
      if (data.countdown && data.event)
        return `Event: ${data.event} • Goes live in: ${data.countdown}`;
      if (data.event) return `Event: ${data.event}`;
      if (data.countdown) return `Goes live in: ${data.countdown}`;
      return undefined;

    case "reaction":
      if (data.emoji && data.targetSnippet)
        return `${data.emoji} on: "${data.targetSnippet}"`;
      if (data.targetSnippet) return `On: "${data.targetSnippet}"`;
      return undefined;

    case "achievement":
      return data.title ? `🔥 ${data.title}` : undefined;

    default:
      return undefined;
  }
}

module.exports = { getDefaultNotificationContent, generateAdditionalInfo };
