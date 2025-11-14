// 🔁 Route Loader for Zone 25-14 Backend
// Centralizes and registers all API routes, consistently.

const express = require("express");

// Detect an Express Router/middleware function
function isExpressRouter(x) {
  return (
    typeof x === "function" &&
    typeof x.use === "function" &&
    typeof x.handle === "function"
  );
}

// Safely normalize a module that may export a Router OR a factory returning one
function normalizeRouter(mod, label) {
  if (!mod) {
    throw new Error(`Route module "${label}" exported undefined/null.`);
  }

  // If it already looks like an Express router, use it as-is.
  if (isExpressRouter(mod)) return mod;

  // Some routers export an object (rare) that wraps a router
  if (typeof mod === "object" && isExpressRouter(mod.router)) return mod.router;

  // If it's a function but not an Express router, try to treat it as a factory
  if (typeof mod === "function") {
    // Heuristic: factory functions typically have 0 declared params.
    // (Express routers have length 3: req,res,next)
    if (mod.length === 0) {
      const maybe = mod();
      if (isExpressRouter(maybe)) return maybe;
    }

    // As a fallback, don't invoke unknown functions: explain the problem
    throw new Error(
      `Route module "${label}" exported a function that is not an Express router. ` +
        `Export the router directly (module.exports = router) or a zero-arg factory that returns one.`
    );
  }

  throw new Error(
    `Route module "${label}" has invalid export type (${typeof mod}).`
  );
}

module.exports = function loadRoutes(app) {
  // ─────────────────────────────────────────────
  // 🔐 Auth & Identity
  // ─────────────────────────────────────────────
  app.use(
    "/api/auth",
    normalizeRouter(
      require("../routes/auth/authRoutes"),
      "routes/auth/authRoutes"
    )
  );
  app.use(
    "/api/auth",
    normalizeRouter(
      require("../routes/auth/passwordResetRoutes"),
      "routes/auth/passwordResetRoutes"
    )
  );

  // ─────────────────────────────────────────────
  // 👤 Users, Accounts, Presence
  // ─────────────────────────────────────────────
  app.use(
    "/api/users",
    normalizeRouter(
      require("../routes/users/usersRoutes"),
      "routes/users/usersRoutes"
    )
  );
  app.use(
    "/api/users/accounts",
    normalizeRouter(
      require("../routes/users/accountsRoutes"),
      "routes/users/accountsRoutes"
    )
  );
  app.use(
    "/api/users",
    normalizeRouter(
      require("../routes/users/relationshipRoutes"),
      "routes/users/relationshipRoutes"
    )
  );
  app.use(
    "/api/presence",
    normalizeRouter(
      require("../routes/presenceRoutes"),
      "routes/presenceRoutes"
    )
  );

  // ─────────────────────────────────────────────
  // 🏅 Titles, Badges, Activity, Roles, Points
  // ─────────────────────────────────────────────
  app.use(
    "/api/users/titles",
    normalizeRouter(
      require("../routes/users/titlesRoutes"),
      "routes/users/titlesRoutes"
    )
  );
  app.use(
    "/api/users/badges",
    normalizeRouter(
      require("../routes/users/badgesRoutes"),
      "routes/users/badgesRoutes"
    )
  );
  app.use(
    "/api/users/activity",
    normalizeRouter(
      require("../routes/users/activityRoutes"),
      "routes/users/activityRoutes"
    )
  );
  app.use(
    "/api/roles",
    normalizeRouter(
      require("../routes/roles/rolesRoutes"),
      "routes/roles/rolesRoutes"
    )
  );
  app.use(
    "/api/points",
    normalizeRouter(
      require("../routes/points/pointsRoutes"),
      "../routes/points/pointsRoutes"
    )
  );

  // ─────────────────────────────────────────────
  // 🛍️ E-Commerce
  // ─────────────────────────────────────────────
  app.use(
    "/api/products",
    normalizeRouter(
      require("../routes/products/productRoutes"),
      "routes/products/productRoutes"
    )
  );
  app.use(
    "/api/cart",
    normalizeRouter(
      require("../routes/cart/cartRoutes"),
      "routes/cart/cartRoutes"
    )
  );
  app.use(
    "/api/wishlist",
    normalizeRouter(
      require("../routes/wishlist/wishlistRoutes"),
      "routes/wishlist/wishlistRoutes"
    )
  );
  app.use(
    "/api/orders",
    normalizeRouter(
      require("../routes/orders/orderRoutes"),
      "routes/orders/orderRoutes"
    )
  );

  // ─────────────────────────────────────────────
  // 📦 Subscriptions & Newsletter
  // ─────────────────────────────────────────────
  app.use(
    "/api/subscriptions",
    normalizeRouter(
      require("../routes/subscriptions/subscriptionRoutes"),
      "routes/subscriptions/subscriptionRoutes"
    )
  );
  app.use(
    "/api/newsletter",
    normalizeRouter(
      require("../routes/newsletter/newsletterRoutes"),
      "routes/newsletter/newsletterRoutes"
    )
  );

  // ─────────────────────────────────────────────
  // 💬 Messaging
  // ─────────────────────────────────────────────
  app.use(
    "/api/messaging",
    normalizeRouter(
      require("../routes/messaging/messagingRoutes"),
      "routes/messaging/messagingRoutes"
    )
  );
  app.use(
    "/api/reactions",
    normalizeRouter(
      require("../routes/messaging/reactionRoutes"),
      "routes/messaging/reactionRoutes"
    )
  );
  app.use(
    "/api/messages",
    normalizeRouter(
      require("../routes/messaging/messageUploadRoutes"),
      "routes/messaging/messageUploadRoutes"
    )
  );

  // ─────────────────────────────────────────────
  // 🔎 Search & 🔔 Notifications
  // ─────────────────────────────────────────────
  app.use(
    "/api/search",
    normalizeRouter(
      require("../routes/search/searchRoutes"),
      "routes/search/searchRoutes"
    )
  );
  app.use(
    "/api/notifications",
    normalizeRouter(
      require("../routes/notifications/notificationRoutes"),
      "routes/notifications/notificationRoutes"
    )
  );

  // ─────────────────────────────────────────────
  // 📅 Events
  // ─────────────────────────────────────────────

  app.use(
    "/api/events",
    normalizeRouter(
      require("../routes/events/eventCommentRoutes"),
      "routes/events/eventCommentRoutes"
    )
  );

  app.use(
    "/api/events",
    normalizeRouter(
      require("../routes/events/eventUploadRoutes"),
      "routes/events/eventUploadRoutes"
    )
  );

  app.use(
    "/api/events",
    normalizeRouter(
      require("../routes/events/eventRoutes"),
      "routes/events/eventRoutes"
    )
  );

  // ─────────────────────────────────────────────
  // 📂 Static Assets
  // ─────────────────────────────────────────────
  app.use("/uploads", express.static("uploads"));
};
// src/server.js or wherever you register routes
