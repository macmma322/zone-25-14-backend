// src/routes/events/eventRoutes.js
// Event routes for Zone 32-19
// Role-based access control: Public, Authenticated, Admin (Hype Lead/Founder)

const pool = require("../../config/db");
const express = require("express");
const router = express.Router();
const eventController = require("../../controllers/events/eventController");
const { protectRoute } = require("../../middleware/authMiddleware");
const {
  adminProtect,
  superAdminProtect,
  requireAnyRole,
  ROLES,
} = require("../../middleware/adminMiddleware");
const { body, query, param } = require("express-validator");
const { deleteEventImages } = require("../../utils/imageCleanup");

/* ==================== VALIDATION RULES ==================== */

const eventValidation = [
  body("title")
    .notEmpty()
    .withMessage("Event title is required")
    .isLength({ min: 3, max: 200 })
    .withMessage("Title must be 3-200 characters"),
  body("description")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Description max 5000 characters"),
  body("event_type")
    .optional()
    .isIn([
      "general",
      "giveaway",
      "stream",
      "launch",
      "contest",
      "announcement",
    ])
    .withMessage("Invalid event type"),
  body("starts_at")
    .notEmpty()
    .withMessage("Start date is required")
    .isISO8601()
    .withMessage("Invalid start date format"),
  body("ends_at").optional().isISO8601().withMessage("Invalid end date format"),
  body("max_participants")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Max participants must be a positive integer"),
  body("status")
    .optional()
    .isIn(["upcoming", "live", "ended", "canceled"])
    .withMessage("Invalid status"),
  body("exclusive_to_niche")
    .optional()
    .isIn(["otaku", "stoikr", "wd", "peros", "crithit", "grid", "syndicate"])
    .withMessage("Invalid niche"),
];

const updateEventValidation = [
  body("title")
    .optional()
    .isLength({ min: 3, max: 200 })
    .withMessage("Title must be 3-200 characters"),
  body("description")
    .optional()
    .isLength({ max: 5000 })
    .withMessage("Description max 5000 characters"),
  body("event_type")
    .optional()
    .isIn([
      "general",
      "giveaway",
      "stream",
      "launch",
      "contest",
      "announcement",
    ])
    .withMessage("Invalid event type"),
  body("starts_at")
    .optional()
    .isISO8601()
    .withMessage("Invalid start date format"),
  body("ends_at").optional().isISO8601().withMessage("Invalid end date format"),
  body("status")
    .optional()
    .isIn(["upcoming", "live", "ended", "canceled"])
    .withMessage("Invalid status"),
];

/* ==================== PUBLIC ROUTES ==================== */

// GET /api/events - Get all events with filters
// GET /api/events - Get all events with filters
router.get(
  "/",
  [
    query("status").optional().isString(),
    query("event_type").optional().isString(),
    query("niche").optional().isString(),
    query("featured").optional().isBoolean(),
    query("search").optional().isString(),
    query("start_date").optional().isISO8601(),
    query("end_date").optional().isISO8601(),
    query("limit").optional().isInt({ min: 1, max: 100 }),
    query("offset").optional().isInt({ min: 0 }),
  ],
  protectRoute,
  eventController.fetchAllEvents
);

// GET /api/events/:id - Get single event
router.get(
  "/:id",
  param("id").isUUID().withMessage("Invalid event ID"),
  eventController.fetchEventById
);

// GET /api/events/:id/participants - Get event participants
router.get(
  "/:id/participants",
  param("id").isUUID().withMessage("Invalid event ID"),
  eventController.fetchEventParticipants
);

/* ==================== AUTHENTICATED ROUTES ==================== */

// POST /api/events/:id/register - Register for event
router.post(
  "/:id/register",
  protectRoute,
  param("id").isUUID().withMessage("Invalid event ID"),
  eventController.registerForEvent
);

// DELETE /api/events/:id/register - Unregister from event
router.delete(
  "/:id/register",
  protectRoute,
  param("id").isUUID().withMessage("Invalid event ID"),
  eventController.unregisterFromEvent
);

// GET /api/events/my/registered - Get user's registered events
router.get("/my/registered", protectRoute, eventController.fetchMyEvents);

/* ==================== ADMIN ROUTES ==================== */
// Accessible by: Hype Lead, Founder

// POST /api/events - Create new event
router.post(
  "/",
  protectRoute,
  requireAnyRole([ROLES.FOUNDER, ROLES.HYPE_LEAD]),
  eventValidation,
  eventController.createNewEvent
);

// PATCH /api/events/:id - Update event
router.patch(
  "/:eventId",
  protectRoute,
  requireAnyRole(["Hype Lead", "Founder"]),
  async (req, res) => {
    const { eventId } = req.params;
    const updateData = req.body;
    console.log("Update data received:", updateData);

    try {
      // ✅ Get current event to access old image URLs
      const currentEvent = await pool.query(
        "SELECT banner_image, thumbnail_image FROM events WHERE event_id = $1",
        [eventId]
      );

      if (currentEvent.rows.length === 0) {
        return res.status(404).json({ error: "Event not found" });
      }

      const oldBanner = currentEvent.rows[0].banner_image;
      const oldThumbnail = currentEvent.rows[0].thumbnail_image;

      // Build UPDATE query dynamically
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (fields.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      values.push(eventId);
      const query = `
        UPDATE events 
        SET ${fields.join(", ")}, updated_at = NOW()
        WHERE event_id = $${paramCount}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      // ✅ Delete old images if new ones were uploaded
      if (updateData.banner_image && updateData.banner_image !== oldBanner) {
        console.log("🗑️ Deleting old event images...");
        await deleteEventImages(oldBanner, oldThumbnail);
      }

      res.json({
        message: "Event updated successfully",
        event: result.rows[0],
      });
    } catch (err) {
      console.error("Error updating event:", err);
      res.status(500).json({ error: "Failed to update event" });
    }
  }
);

// PATCH /api/events/:id/deactivate - Soft delete event
router.patch(
  "/:id/deactivate",
  protectRoute,
  requireAnyRole([ROLES.FOUNDER, ROLES.HYPE_LEAD]),
  param("id").isUUID().withMessage("Invalid event ID"),
  eventController.deactivateEvent
);

/* ==================== FOUNDER ONLY ROUTES ==================== */

// ✅ DELETE EVENT - Delete images
router.delete(
  "/:eventId",
  protectRoute,
  requireAnyRole(["Founder"]), // Only founders can delete
  async (req, res) => {
    const { eventId } = req.params;

    try {
      // ✅ Get event images before deletion
      const event = await pool.query(
        "SELECT banner_image, thumbnail_image FROM events WHERE event_id = $1",
        [eventId]
      );

      if (event.rows.length === 0) {
        return res.status(404).json({ error: "Event not found" });
      }

      const { banner_image, thumbnail_image } = event.rows[0];

      // Delete event from database
      await pool.query("DELETE FROM events WHERE event_id = $1", [eventId]);

      // ✅ Delete associated images
      console.log("🗑️ Deleting event images...");
      await deleteEventImages(banner_image, thumbnail_image);

      res.json({ message: "Event and images deleted successfully" });
    } catch (err) {
      console.error("Error deleting event:", err);
      res.status(500).json({ error: "Failed to delete event" });
    }
  }
);

/* ==================== ROUTE DOCUMENTATION ==================== */

/**
 * ROUTE ACCESS LEVELS:
 *
 * PUBLIC (no auth):
 * - GET /api/events (list with filters)
 * - GET /api/events/:id (single event)
 * - GET /api/events/:id/participants (event participants)
 *
 * AUTHENTICATED (any user):
 * - POST /api/events/:id/register (register for event)
 * - DELETE /api/events/:id/register (unregister from event)
 * - GET /api/events/my/registered (get user's registered events)
 *
 * ADMIN (Hype Lead, Founder):
 * - POST /api/events (create event)
 * - PATCH /api/events/:id (update event)
 * - PATCH /api/events/:id/deactivate (deactivate event)
 *
 * FOUNDER ONLY:
 * - DELETE /api/events/:id (hard delete event)
 */

module.exports = router;
