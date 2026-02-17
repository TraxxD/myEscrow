const db = require('../config/db');

/**
 * Log an audit event to the database
 */
function logAudit({ userId, action, resource, resourceId, details, ip }) {
  db.audit.log({ userId, action, resource, resourceId, details, ip });
}

/**
 * Express middleware to attach IP to request for audit logging
 */
function attachIp(req, res, next) {
  req.clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || req.socket.remoteAddress;
  next();
}

module.exports = { logAudit, attachIp };
