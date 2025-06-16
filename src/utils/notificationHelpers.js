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

module.exports = { getDefaultNotificationContent };
