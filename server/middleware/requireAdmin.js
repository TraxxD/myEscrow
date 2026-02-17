const db = require('../config/db');

/**
 * Middleware: require admin role
 * Must be used AFTER authenticate middleware
 */
function requireAdmin(req, res, next) {
  const user = db.users.getById(req.user.id);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Admin access required', status: 403 },
    });
  }
  next();
}

module.exports = requireAdmin;
