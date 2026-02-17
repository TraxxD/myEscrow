const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Token required', status: 401 },
    });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid token', status: 401 },
    });
  }
}

module.exports = { authenticate, JWT_SECRET };
