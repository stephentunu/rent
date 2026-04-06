const jwt = require("jsonwebtoken");
const db = require("../db/init");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

/**
 * Require a valid JWT. Attaches req.user = { id, email, role }.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Verify user still exists
    const user = db.prepare("SELECT id, email FROM users WHERE id = ?").get(payload.id);
    if (!user) return res.status(401).json({ message: "User not found" });

    const roleRow = db.prepare("SELECT role FROM user_roles WHERE user_id = ?").get(payload.id);
    req.user = { id: payload.id, email: user.email, role: roleRow?.role || "user" };
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/**
 * Require admin role.
 */
function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }
    next();
  });
}

/**
 * Optional auth — attaches req.user if token present, doesn't fail if not.
 */
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const roleRow = db.prepare("SELECT role FROM user_roles WHERE user_id = ?").get(payload.id);
    req.user = { id: payload.id, email: payload.email, role: roleRow?.role || "user" };
  } catch { /* ignore */ }
  next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth };
