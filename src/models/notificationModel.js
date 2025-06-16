// File: src/models/notificationTypes.js
// Description: Centralized definition of all valid notification types
// Used to validate and standardize notification creation

const NotificationTypes = Object.freeze({
  MESSAGE: "message",
  FRIEND: "friend",
  REACTION: "reaction",
  REPLY: "reply",
  ORDER: "order",
  EVENT: "event",
  STREAM: "stream",
  ANNOUNCEMENT: "announcement",
  GIVEAWAY: "giveaway",
  DONATION: "donation",
});

module.exports = NotificationTypes;
