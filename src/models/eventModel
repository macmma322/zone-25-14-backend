// src/models/eventModel.js
// Event model for Zone 32-19
// Handles all database operations for events and participants

const pool = require("../config/db");

/* ==================== EVENTS ==================== */

/**
 * Get all events with filters
 */
const getAllEvents = async (filters = {}) => {
  try {
    let query = `
      SELECT 
        e.*,
        u.username as creator_username,
        u.profile_picture as creator_avatar,
        (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.event_id AND ep.status = 'registered') as participant_count
      FROM events e
      LEFT JOIN users u ON e.created_by = u.user_id
      WHERE e.is_active = TRUE  -- ✅ Keep active events
    `;

    const values = [];
    let paramCount = 1;

    // ✅ Filter by status - this will include 'canceled' if requested
    if (filters.status) {
      query += ` AND e.status = $${paramCount}`;
      values.push(filters.status);
      paramCount++;
    }
    // ✅ If no status filter, show ALL statuses including canceled

    // ... rest of your filters stay the same ...

    // Filter by event type
    if (filters.event_type) {
      query += ` AND e.event_type = $${paramCount}`;
      values.push(filters.event_type);
      paramCount++;
    }

    // Filter by niche
    if (filters.niche) {
      query += ` AND (e.exclusive_to_niche = $${paramCount} OR e.exclusive_to_niche IS NULL)`;
      values.push(filters.niche);
      paramCount++;
    }

    // Filter by featured
    if (filters.featured === true || filters.featured === "true") {
      query += ` AND e.is_featured = TRUE`;
    }

    // Search by title or description
    if (filters.search) {
      query += ` AND (
        LOWER(e.title) LIKE LOWER($${paramCount}) OR 
        LOWER(e.description) LIKE LOWER($${paramCount})
      )`;
      values.push(`%${filters.search}%`);
      paramCount++;
    }

    // Date range filter
    if (filters.start_date) {
      query += ` AND e.starts_at >= $${paramCount}`;
      values.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND e.starts_at <= $${paramCount}`;
      values.push(filters.end_date);
      paramCount++;
    }

    // Order by
    const orderBy = filters.order_by || "starts_at";
    const order = filters.order === "asc" ? "ASC" : "DESC";
    query += ` ORDER BY e.${orderBy} ${order}`;

    // Pagination
    const limit = parseInt(filters.limit) || 50;
    const offset = parseInt(filters.offset) || 0;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const { rows } = await pool.query(query, values);
    return rows;
  } catch (error) {
    console.error("Error in getAllEvents:", error.message);
    throw error;
  }
};

/**
 * Get single event by ID with full details
 */
const getEventById = async (eventId) => {
  try {
    const query = `
      SELECT 
        e.*,
        u.username as creator_username,
        u.profile_picture as creator_avatar,
        u.user_id as creator_id,
        (SELECT COUNT(*) FROM event_participants ep WHERE ep.event_id = e.event_id AND ep.status = 'registered') as participant_count,
        (SELECT json_agg(json_build_object(
          'user_id', u2.user_id,
          'username', u2.username,
          'profile_picture', u2.profile_picture,
          'registered_at', ep2.registered_at
        )) FROM event_participants ep2
        JOIN users u2 ON ep2.user_id = u2.user_id
        WHERE ep2.event_id = e.event_id AND ep2.status = 'registered'
        LIMIT 10) as recent_participants
      FROM events e
      LEFT JOIN users u ON e.created_by = u.user_id
      WHERE e.event_id = $1
    `;

    const { rows } = await pool.query(query, [eventId]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error in getEventById:", error.message);
    throw error;
  }
};
/**
 * Get all user registrations for multiple events
 * More efficient than checking each event individually
 */
const getUserRegistrations = async (userId, eventIds) => {
  try {
    // Handle empty array case
    if (!eventIds || eventIds.length === 0) {
      return [];
    }

    const query = `
      SELECT event_id
      FROM event_participants
      WHERE user_id = $1 AND event_id = ANY($2)
    `;

    const result = await pool.query(query, [userId, eventIds]);
    return result.rows;
  } catch (error) {
    console.error("Error getting user registrations:", error);
    throw error;
  }
};

/**
 * Create new event
 */
const createEvent = async (eventData) => {
  try {
    const query = `
      INSERT INTO events (
        created_by, title, description, event_type,
        starts_at, ends_at, location, max_participants,
        banner_image, thumbnail_image, is_featured,
        status, exclusive_to_niche, tags, external_link, prize_description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `;

    const values = [
      eventData.created_by,
      eventData.title,
      eventData.description,
      eventData.event_type || "general",
      eventData.starts_at,
      eventData.ends_at,
      eventData.location,
      eventData.max_participants,
      eventData.banner_image,
      eventData.thumbnail_image,
      eventData.is_featured || false,
      eventData.status || "upcoming",
      eventData.exclusive_to_niche,
      eventData.tags || [],
      eventData.external_link,
      eventData.prize_description,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    console.error("Error in createEvent:", error.message);
    throw error;
  }
};

/**
 * Update existing event
 */
const updateEvent = async (eventId, updateData) => {
  try {
    const fields = [];
    const values = [];
    let paramCount = 1;

    // Build dynamic update query
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined && key !== "event_id") {
        fields.push(`${key} = $${paramCount}`);
        values.push(updateData[key]);
        paramCount++;
      }
    });

    if (fields.length === 0) {
      throw new Error("No fields to update");
    }

    values.push(eventId);
    const query = `
      UPDATE events
      SET ${fields.join(", ")}
      WHERE event_id = $${paramCount}
      RETURNING *
    `;

    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (error) {
    console.error("Error in updateEvent:", error.message);
    throw error;
  }
};

/**
 * Soft delete event (set status to canceled)
 */
const softDeleteEvent = async (eventId) => {
  try {
    const query = `
      UPDATE events
      SET status = 'canceled', updated_at = NOW()
      WHERE event_id = $1
      RETURNING *
    `;

    const { rows } = await pool.query(query, [eventId]);
    return rows[0];
  } catch (error) {
    console.error("Error in softDeleteEvent:", error.message);
    throw error;
  }
};

/**
 * Hard delete event (permanent removal)
 */
const hardDeleteEvent = async (eventId) => {
  try {
    const query = `DELETE FROM events WHERE event_id = $1 RETURNING *`;
    const { rows } = await pool.query(query, [eventId]);
    return rows[0];
  } catch (error) {
    console.error("Error in hardDeleteEvent:", error.message);
    throw error;
  }
};

/* ==================== PARTICIPANTS ==================== */

/**
 * Register user for event
 */
const registerParticipant = async (eventId, userId) => {
  try {
    // Check if event has space
    const eventCheck = await pool.query(
      `SELECT max_participants, current_participants FROM events WHERE event_id = $1`,
      [eventId]
    );

    if (!eventCheck.rows[0]) {
      throw new Error("Event not found");
    }

    const { max_participants, current_participants } = eventCheck.rows[0];

    if (max_participants && current_participants >= max_participants) {
      throw new Error("Event is full");
    }

    // Register participant
    const query = `
      INSERT INTO event_participants (event_id, user_id, status)
      VALUES ($1, $2, 'registered')
      ON CONFLICT (event_id, user_id) DO NOTHING
      RETURNING *
    `;

    const { rows } = await pool.query(query, [eventId, userId]);

    // Update participant count
    if (rows[0]) {
      await pool.query(
        `UPDATE events SET current_participants = current_participants + 1 WHERE event_id = $1`,
        [eventId]
      );
    }

    return rows[0];
  } catch (error) {
    console.error("Error in registerParticipant:", error.message);
    throw error;
  }
};

/**
 * Unregister user from event
 */
const unregisterParticipant = async (eventId, userId) => {
  try {
    const query = `
      DELETE FROM event_participants
      WHERE event_id = $1 AND user_id = $2
      RETURNING *
    `;

    const { rows } = await pool.query(query, [eventId, userId]);

    if (rows[0]) {
      await pool.query(
        `UPDATE events SET current_participants = GREATEST(current_participants - 1, 0) WHERE event_id = $1`,
        [eventId]
      );
    }

    return rows[0];
  } catch (error) {
    console.error("Error in unregisterParticipant:", error.message);
    throw error;
  }
};

/**
 * Check if user is registered for event
 */
const isUserRegistered = async (eventId, userId) => {
  try {
    const query = `
      SELECT 1 FROM event_participants
      WHERE event_id = $1 AND user_id = $2
    `;

    const { rows } = await pool.query(query, [eventId, userId]);
    return rows.length > 0;
  } catch (error) {
    console.error("Error in isUserRegistered:", error.message);
    throw error;
  }
};

/**
 * Get all participants for an event
 */
const getEventParticipants = async (eventId) => {
  try {
    const query = `
      SELECT 
        ep.*,
        u.username,
        u.profile_picture,
        u.display_name
      FROM event_participants ep
      JOIN users u ON ep.user_id = u.user_id
      WHERE ep.event_id = $1
      ORDER BY ep.registered_at DESC
    `;

    const { rows } = await pool.query(query, [eventId]);
    return rows;
  } catch (error) {
    console.error("Error in getEventParticipants:", error.message);
    throw error;
  }
};

/**
 * Get user's registered events
 */
const getUserEvents = async (userId) => {
  try {
    const query = `
      SELECT 
        e.*,
        u.username as creator_username,
        ep.registered_at,
        ep.status as participant_status
      FROM event_participants ep
      JOIN events e ON ep.event_id = e.event_id
      LEFT JOIN users u ON e.created_by = u.user_id
      WHERE ep.user_id = $1 AND e.is_active = TRUE
      ORDER BY e.starts_at DESC
    `;

    const { rows } = await pool.query(query, [userId]);
    return rows;
  } catch (error) {
    console.error("Error in getUserEvents:", error.message);
    throw error;
  }
};

module.exports = {
  // Events
  getAllEvents,
  getEventById,
  getUserRegistrations,
  createEvent,
  updateEvent,
  softDeleteEvent,
  hardDeleteEvent,

  // Participants
  registerParticipant,
  unregisterParticipant,
  isUserRegistered,
  getEventParticipants,
  getUserEvents,
};
