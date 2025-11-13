// src/middleware/adminMiddleware.js
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

/* ==================== ROLE DEFINITIONS (match DB exactly) ==================== */

const ROLES = {
  FOUNDER: "Founder",
  HYPE_LEAD: "Hype Lead",
  STORE_CHIEF: "Store Chief",
  MODERATOR: "Moderator",
  ULTIMATE: "Ultimate",
  LEGEND: "Legend",
  ELITE: "Elite Member",
  SUPPORTER: "Supporter",
  EXPLORER: "Explorer",
};

// Groups
const ADMIN_ROLES = new Set([
  ROLES.FOUNDER,
  ROLES.HYPE_LEAD,
  ROLES.STORE_CHIEF,
]);
const SUPER_ADMIN_ROLES = new Set([ROLES.FOUNDER]);
const MODERATOR_ROLES = new Set([
  ROLES.FOUNDER,
  ROLES.HYPE_LEAD,
  ROLES.MODERATOR,
]);

/* ==================== HELPERS ==================== */

const getToken = (req) => {
  if (req.cookies?.authToken) return req.cookies.authToken;
  const h = req.headers.authorization || "";
  if (h.toLowerCase().startsWith("bearer ")) return h.slice(7).trim();
  return null;
};

function parsePermissions(jsonb) {
  if (!jsonb) return {};
  if (typeof jsonb === "object") return jsonb;
  try {
    return JSON.parse(jsonb);
  } catch {
    return {};
  }
}

/**
 * Fetch role info from DB (no slug needed).
 * Returns: { role_name, is_staff, permissions }
 */
async function getUserRole(userId) {
  const { rows } = await pool.query(
    `
    SELECT rl.role_name, rl.is_staff, rl.permissions
    FROM public.users u
    JOIN public.user_roles_levels rl ON u.role_level_id = rl.role_level_id
    WHERE u.user_id = $1
    `,
    [userId]
  );
  if (!rows[0]) return null;
  return {
    role_name: rows[0].role_name,
    is_staff: !!rows[0].is_staff,
    permissions: parsePermissions(rows[0].permissions),
  };
}

/* ==================== CORE CHECKERS (role_name + is_staff only) ==================== */

const allowIfAdmin = (role) => role.is_staff || ADMIN_ROLES.has(role.role_name);

const allowIfSuperAdmin = (role) => SUPER_ADMIN_ROLES.has(role.role_name);

const allowIfModerator = (role) =>
  role.is_staff || MODERATOR_ROLES.has(role.role_name);

/* ==================== MIDDLEWARE ==================== */

const adminProtect = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token)
      return res
        .status(401)
        .json({ message: "Authentication required", required_role: "admin" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId || decoded.user_id };

    const role = await getUserRole(req.user.userId);
    if (!role)
      return res
        .status(403)
        .json({ message: "Access denied: User role not found" });

    if (allowIfAdmin(role)) {
      req.user.role = role.role_name;
      req.user.isStaff = role.is_staff;
      req.user.permissions = role.permissions;
      return next();
    }
    return res.status(403).json({
      message: "Access denied: Admin privileges required",
      your_role: role.role_name,
      required_roles: Array.from(ADMIN_ROLES),
    });
  } catch (err) {
    console.error("[adminProtect]", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const superAdminProtect = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token)
      return res.status(401).json({
        message: "Authentication required",
        required_role: "super_admin",
      });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId || decoded.user_id };

    const role = await getUserRole(req.user.userId);
    if (!role)
      return res
        .status(403)
        .json({ message: "Access denied: User role not found" });

    if (allowIfSuperAdmin(role)) {
      req.user.role = role.role_name;
      req.user.isStaff = role.is_staff;
      req.user.permissions = role.permissions;
      return next();
    }
    return res.status(403).json({
      message: "Access denied: Super admin privileges required",
      your_role: role.role_name,
      required_roles: Array.from(SUPER_ADMIN_ROLES),
    });
  } catch (err) {
    console.error("[superAdminProtect]", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const moderatorProtect = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token)
      return res.status(401).json({
        message: "Authentication required",
        required_role: "moderator",
      });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId || decoded.user_id };

    const role = await getUserRole(req.user.userId);
    if (!role)
      return res
        .status(403)
        .json({ message: "Access denied: User role not found" });

    if (allowIfModerator(role)) {
      req.user.role = role.role_name;
      req.user.isStaff = role.is_staff;
      req.user.permissions = role.permissions;
      return next();
    }
    return res.status(403).json({
      message: "Access denied: Moderator privileges required",
      your_role: role.role_name,
      required_roles: ["Moderator", "Hype Lead", "Founder"],
    });
  } catch (err) {
    console.error("[moderatorProtect]", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

const staffProtect = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token)
      return res
        .status(401)
        .json({ message: "Authentication required", required_role: "staff" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId || decoded.user_id };

    const role = await getUserRole(req.user.userId);
    if (!role)
      return res
        .status(403)
        .json({ message: "Access denied: User role not found" });

    if (role.is_staff) {
      req.user.role = role.role_name;
      req.user.isStaff = role.is_staff;
      req.user.permissions = role.permissions;
      return next();
    }
    return res.status(403).json({
      message: "Access denied: Staff privileges required",
      your_role: role.role_name,
    });
  } catch (err) {
    console.error("[staffProtect]", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

/**
 * Permission-based guard (reads permissions JSONB on the role).
 * Usage: router.post("/points/manual-add", adminProtect, requirePermission("manage_points"), handler);
 */
const requirePermission = (permKey) => (req, res, next) => {
  // admins (is_staff/ADMIN) are allowed regardless of the key
  if (req.user?.isStaff || ADMIN_ROLES.has(req.user?.role)) return next();
  if (req.user?.permissions?.[permKey] === true) return next();
  return res.status(403).json({ message: `Missing permission: ${permKey}` });
};

/**
 * Generic: allow any of the provided role names (display names)
 */
const requireAnyRole = (allowedRoleNames = []) => {
  const allowed = new Set(allowedRoleNames);
  return async (req, res, next) => {
    try {
      const token = getToken(req);
      if (!token)
        return res.status(401).json({ message: "Authentication required" });

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { userId: decoded.userId || decoded.user_id };

      const role = await getUserRole(req.user.userId);
      if (!role)
        return res
          .status(403)
          .json({ message: "Access denied: User role not found" });

      if (allowed.has(role.role_name)) {
        req.user.role = role.role_name;
        req.user.isStaff = role.is_staff;
        req.user.permissions = role.permissions;
        return next();
      }
      return res.status(403).json({
        message: "Access denied: Insufficient privileges",
        your_role: role.role_name,
      });
    } catch (err) {
      console.error("[requireAnyRole]", err.message);
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
};

/**
 * Non-blocking: attach role info if available
 */
const checkRole = async (req, res, next) => {
  try {
    const token = getToken(req);
    if (!token) {
      req.user = { ...req.user, role: null, isStaff: false, permissions: {} };
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId || decoded.user_id };

    const role = await getUserRole(req.user.userId);
    if (role) {
      req.user.role = role.role_name;
      req.user.isStaff = role.is_staff;
      req.user.permissions = role.permissions;
    } else {
      req.user = { ...req.user, role: null, isStaff: false, permissions: {} };
    }
    next();
  } catch {
    req.user = { ...req.user, role: null, isStaff: false, permissions: {} };
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
  requirePermission, // ← new, for fine-grained checks
  requireAnyRole,
  checkRole,

  // Constants
  ROLES,
  ADMIN_ROLES: Array.from(ADMIN_ROLES),
  SUPER_ADMIN_ROLES: Array.from(SUPER_ADMIN_ROLES),
  MODERATOR_ROLES: Array.from(MODERATOR_ROLES),

  // Helpers
  getUserRole,
};
