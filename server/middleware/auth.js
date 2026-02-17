const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Token required', status: 401 },
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if token has been blacklisted (logout)
    if (decoded.jti && db.tokenBlacklist.has(decoded.jti)) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Token revoked', status: 401 },
      });
    }

    req.user = decoded;
    next();
  } catch {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid token', status: 401 },
    });
  }
}

function generateTokens(user) {
  const accessJti = uuidv4();
  const refreshJti = uuidv4();

  const accessToken = jwt.sign(
    { id: user.id, username: user.username, email: user.email, jti: accessJti },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    { id: user.id, username: user.username, email: user.email, jti: refreshJti, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

function verifyRefreshToken(token) {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.type !== 'refresh') {
    throw new Error('Not a refresh token');
  }
  if (db.tokenBlacklist.has(decoded.jti)) {
    throw new Error('Token revoked');
  }
  return decoded;
}

module.exports = { authenticate, generateTokens, verifyRefreshToken, JWT_SECRET };
