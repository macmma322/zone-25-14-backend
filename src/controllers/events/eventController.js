// src/controllers/events/eventController.js
// Event controller for Zone 32-19
// Handles HTTP requests for events management

const { validationResult } = require("express-validator");
const {
  getAllEvents,
  getEventById,
  getUserRegistrations,
  createEvent,
  updateEvent,
  softDeleteEvent,
  hardDeleteEvent,
  registerParticipant,
  unregisterParticipant,
  isUserRegistered,
  getEventParticipants,
  getUserEvents,
} = require("../../models/eventModel");

/* ==================== EVENT CRUD ==================== */

/**
 * GET /api/events
 * Fetch all events with filters (PUBLIC) - OPTIMIZED
 */
const fetchAllEvents = async (req, res) => {
  try {
    const filters = {
      status: req.query.status,
      event_type: req.query.event_type,
      niche: req.query.niche,
      featured: req.query.featured,
      search: req.query.search,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      order_by: req.query.order_by || "starts_at",
      order: req.query.order || "desc",
      limit: parseInt(req.query.limit) || 50,
      offset: parseInt(req.query.offset) || 0,
    };

    const events = await getAllEvents(filters);

    // ✅ If user is authenticated, get all their registrations at once
    if (req.user?.userId) {
      const eventIds = events.map((e) => e.event_id);

      // Get all user registrations for these events in one query
      const userRegistrations = await getUserRegistrations(
        req.user.userId,
        eventIds
      );

      // Create a Set for O(1) lookup
      const registeredEventIds = new Set(
        userRegistrations.map((r) => r.event_id)
      );

      // Add is_registered flag to each event
      const eventsWithRegistration = events.map((event) => ({
        ...event,
        is_registered: registeredEventIds.has(event.event_id),
      }));

      return res.status(200).json({
        success: true,
        count: eventsWithRegistration.length,
        events: eventsWithRegistration,
      });
    }

    // If no user, return events without registration status
    res.status(200).json({
      success: true,
      count: events.length,
      events: events.map((event) => ({ ...event, is_registered: false })),
    });
  } catch (error) {
    console.error("Error fetching events:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch events",
    });
  }
};

/**
 * GET /api/events/:id
 * Fetch single event by ID (PUBLIC)
 */
const fetchEventById = async (req, res) => {
  try {
    const event = await getEventById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // If user is authenticated, check if they're registered
    if (req.user?.userId) {
      event.is_registered = await isUserRegistered(
        req.params.id,
        req.user.userId
      );
    }

    res.status(200).json({
      success: true,
      event,
    });
  } catch (error) {
    console.error("Error fetching event:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch event",
    });
  }
};

/**
 * POST /api/events
 * Create new event (ADMIN ONLY)
 */
const createNewEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const eventData = {
      created_by: req.user.userId,
      title: req.body.title,
      description: req.body.description,
      event_type: req.body.event_type || "general",
      starts_at: req.body.starts_at,
      ends_at: req.body.ends_at,
      location: req.body.location,
      max_participants: req.body.max_participants,
      banner_image: req.body.banner_image,
      thumbnail_image: req.body.thumbnail_image,
      is_featured: req.body.is_featured || false,
      status: req.body.status || "upcoming",
      exclusive_to_niche: req.body.exclusive_to_niche,
      tags: req.body.tags || [],
      external_link: req.body.external_link,
      prize_description: req.body.prize_description,
    };

    const event = await createEvent(eventData);

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      event,
    });
  } catch (error) {
    console.error("Error creating event:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to create event",
    });
  }
};

/**
 * PATCH /api/events/:id
 * Update event (ADMIN ONLY)
 */
const updateEventById = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    });
  }

  try {
    const updateData = {};

    // Only include fields that are provided
    const allowedFields = [
      "title",
      "description",
      "event_type",
      "starts_at",
      "ends_at",
      "location",
      "max_participants",
      "banner_image",
      "thumbnail_image",
      "is_featured",
      "status",
      "exclusive_to_niche",
      "tags",
      "external_link",
      "prize_description",
      "winner_user_ids",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update",
      });
    }

    const event = await updateEvent(req.params.id, updateData);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event,
    });
  } catch (error) {
    console.error("Error updating event:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update event",
    });
  }
};

/**
 * PATCH /api/events/:id/deactivate
 * Soft delete event (ADMIN ONLY)
 */
const deactivateEvent = async (req, res) => {
  try {
    const event = await softDeleteEvent(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Event canceled successfully", // ✅ Changed message
      event,
    });
  } catch (error) {
    console.error("Error canceling event:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to cancel event",
    });
  }
};

/**
 * DELETE /api/events/:id
 * Hard delete event (FOUNDER ONLY)
 */
const deleteEvent = async (req, res) => {
  try {
    const event = await hardDeleteEvent(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Event permanently deleted",
    });
  } catch (error) {
    console.error("Error deleting event:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete event",
    });
  }
};

/* ==================== PARTICIPANT MANAGEMENT ==================== */

/**
 * POST /api/events/:id/register
 * Register for event (AUTHENTICATED)
 */
const registerForEvent = async (req, res) => {
  try {
    const participant = await registerParticipant(
      req.params.id,
      req.user.userId
    );

    if (!participant) {
      return res.status(400).json({
        success: false,
        message: "Already registered or event is full",
      });
    }

    res.status(200).json({
      success: true,
      message: "Successfully registered for event",
      participant,
    });
  } catch (error) {
    console.error("Error registering for event:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to register for event",
    });
  }
};

/**
 * DELETE /api/events/:id/register
 * Unregister from event (AUTHENTICATED)
 */
const unregisterFromEvent = async (req, res) => {
  try {
    const result = await unregisterParticipant(req.params.id, req.user.userId);

    if (!result) {
      return res.status(400).json({
        success: false,
        message: "Not registered for this event",
      });
    }

    res.status(200).json({
      success: true,
      message: "Successfully unregistered from event",
    });
  } catch (error) {
    console.error("Error unregistering from event:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to unregister from event",
    });
  }
};

/**
 * GET /api/events/:id/participants
 * Get all participants for event (PUBLIC)
 */
const fetchEventParticipants = async (req, res) => {
  try {
    const participants = await getEventParticipants(req.params.id);

    res.status(200).json({
      success: true,
      count: participants.length,
      participants,
    });
  } catch (error) {
    console.error("Error fetching participants:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch participants",
    });
  }
};

/**
 * GET /api/events/my/registered
 * Get user's registered events (AUTHENTICATED)
 */
const fetchMyEvents = async (req, res) => {
  try {
    const events = await getUserEvents(req.user.userId);

    res.status(200).json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    console.error("Error fetching user events:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch your events",
    });
  }
};

module.exports = {
  // Event CRUD
  fetchAllEvents,
  getUserRegistrations,
  fetchEventById,
  createNewEvent,
  updateEventById,
  deactivateEvent,
  deleteEvent,

  // Participants
  registerForEvent,
  unregisterFromEvent,
  fetchEventParticipants,
  fetchMyEvents,
};
