// src/middleware/adminMiddleware.js
// Enhanced admin middleware with granular role-based access control
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

/* ==================== ROLE DEFINITIONS ==================== */

const ROLES = {
  FOUNDER: "Founder", // Highest level - full access
  HYPE_LEAD: "Hype Lead", // Senior admin
  STORE_CHIEF: "Store Chief", // Product/store management
  MODERATOR: "Moderator", // Community moderation
  VIP: "VIP", // Premium user
  REGULAR: "Explorer", // Default user
};

const ADMIN_ROLES = [ROLES.FOUNDER, ROLES.HYPE_LEAD, ROLES.STORE_CHIEF];

const SUPER_ADMIN_ROLES = [ROLES.FOUNDER];

const MODERATOR_ROLES = [ROLES.FOUNDER, ROLES.HYPE_LEAD, ROLES.MODERATOR];

/* ==================== HELPER FUNCTIONS ==================== */

/**
 * Get user role from database
 */
async function getUserRole(userId) {
  try {
    const query = `
      SELECT rl.role_name, rl.is_staff
      FROM users u
      JOIN user_roles_levels rl ON u.role_level_id = rl.role_level_id
      WHERE u.user_id = $1
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error fetching user role:", error.message);
    return null;
  }
}

/**
 * Check if user has any of the specified roles
 */
function hasAnyRole(userRole, allowedRoles) {
  return allowedRoles.includes(userRole);
}

/**
 * Check if user is staff
 */
function isStaff(roleData) {
  return roleData?.is_staff === true;
}

/* ==================== MIDDLEWARE FUNCTIONS ==================== */

/**
 * General admin protection
 * Allows: Store Chief, Hype Lead, Founder
 */
const adminProtect = async (req, res, next) => {
  const token = req.cookies.authToken;

  if (!token) {
    return res.status(401).json({
      message: "Authentication required",
      required_role: "admin",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId || decoded.user_id };

    const roleData = await getUserRole(req.user.userId);

    if (!roleData) {
      return res.status(403).json({
        message: "Access denied: User role not found",
      });
    }

    if (hasAnyRole(roleData.role_name, ADMIN_ROLES)) {
      req.user.role = roleData.role_name;
      req.user.isStaff = roleData.is_staff;
      return next();
    }

    return res.status(403).json({
      message: "Access denied: Admin privileges required",
      your_role: roleData.role_name,
      required_roles: ADMIN_ROLES,
    });
  } catch (error) {
    console.error("Admin Auth Error:", error.message);
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

/**
 * Super admin protection
 * Allows: Founder only
 */
const superAdminProtect = async (req, res, next) => {
  const token = req.cookies.authToken;

  if (!token) {
    return res.status(401).json({
      message: "Authentication required",
      required_role: "super_admin",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId || decoded.user_id };

    const roleData = await getUserRole(req.user.userId);

    if (!roleData) {
      return res.status(403).json({
        message: "Access denied: User role not found",
      });
    }

    if (hasAnyRole(roleData.role_name, SUPER_ADMIN_ROLES)) {
      req.user.role = roleData.role_name;
      req.user.isStaff = roleData.is_staff;
      return next();
    }

    return res.status(403).json({
      message: "Access denied: Super admin privileges required",
      your_role: roleData.role_name,
      required_roles: SUPER_ADMIN_ROLES,
    });
  } catch (error) {
    console.error("Super Admin Auth Error:", error.message);
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

/**
 * Moderator protection
 * Allows: Moderator, Hype Lead, Founder
 */
const moderatorProtect = async (req, res, next) => {
  const token = req.cookies.authToken;

  if (!token) {
    return res.status(401).json({
      message: "Authentication required",
      required_role: "moderator",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId || decoded.user_id };

    const roleData = await getUserRole(req.user.userId);

    if (!roleData) {
      return res.status(403).json({
        message: "Access denied: User role not found",
      });
    }

    if (hasAnyRole(roleData.role_name, MODERATOR_ROLES)) {
      req.user.role = roleData.role_name;
      req.user.isStaff = roleData.is_staff;
      return next();
    }

    return res.status(403).json({
      message: "Access denied: Moderator privileges required",
      your_role: roleData.role_name,
      required_roles: MODERATOR_ROLES,
    });
  } catch (error) {
    console.error("Moderator Auth Error:", error.message);
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

/**
 * Staff protection (any staff member)
 * Allows: Any user with is_staff = true
 */
const staffProtect = async (req, res, next) => {
  const token = req.cookies.authToken;

  if (!token) {
    return res.status(401).json({
      message: "Authentication required",
      required_role: "staff",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId || decoded.user_id };

    const roleData = await getUserRole(req.user.userId);

    if (!roleData) {
      return res.status(403).json({
        message: "Access denied: User role not found",
      });
    }

    if (isStaff(roleData)) {
      req.user.role = roleData.role_name;
      req.user.isStaff = roleData.is_staff;
      return next();
    }

    return res.status(403).json({
      message: "Access denied: Staff privileges required",
      your_role: roleData.role_name,
    });
  } catch (error) {
    console.error("Staff Auth Error:", error.message);
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

/**
 * Custom role checker - allows specific roles
 * Usage: requireAnyRole([ROLES.FOUNDER, ROLES.HYPE_LEAD])
 */
const requireAnyRole = (allowedRoles) => {
  return async (req, res, next) => {
    const token = req.cookies.authToken;

    if (!token) {
      return res.status(401).json({
        message: "Authentication required",
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { userId: decoded.userId || decoded.user_id };

      const roleData = await getUserRole(req.user.userId);

      if (!roleData) {
        return res.status(403).json({
          message: "Access denied: User role not found",
        });
      }

      if (hasAnyRole(roleData.role_name, allowedRoles)) {
        req.user.role = roleData.role_name;
        req.user.isStaff = roleData.is_staff;
        return next();
      }

      return res.status(403).json({
        message: "Access denied: Insufficient privileges",
        your_role: roleData.role_name,
        required_roles: allowedRoles,
      });
    } catch (error) {
      console.error("Role Auth Error:", error.message);
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }
  };
};

/**
 * Check role middleware - attaches role info but doesn't block
 * Useful for optional permissions
 */
const checkRole = async (req, res, next) => {
  const token = req.cookies.authToken;

  if (!token) {
    req.user = { ...req.user, role: null, isStaff: false };
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId || decoded.user_id };

    const roleData = await getUserRole(req.user.userId);

    if (roleData) {
      req.user.role = roleData.role_name;
      req.user.isStaff = roleData.is_staff;
    }

    next();
  } catch (error) {
    req.user = { ...req.user, role: null, isStaff: false };
    next();
  }
};

/* ==================== EXPORTS ==================== */

module.exports = {
  // Middleware
  adminProtect,
  superAdminProtect,
  moderatorProtect,
  staffProtect,
  requireAnyRole,
  checkRole,

  // Constants (for use in controllers/routes)
  ROLES,
  ADMIN_ROLES,
  SUPER_ADMIN_ROLES,
  MODERATOR_ROLES,

  // Helpers (for use in controllers)
  getUserRole,
  hasAnyRole,
  isStaff,
};
