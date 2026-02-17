const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticate, generateTokens, verifyRefreshToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema } = require('../utils/schemas');
const logger = require('../utils/logger');

const router = express.Router();

// POST /api/auth/register
router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Check for existing email
    const existing = [...db.users.values()].find(u => u.email === email);
    if (existing) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Email already registered', status: 400 },
      });
    }

    // Check for existing username
    const existingUsername = [...db.users.values()].find(u => u.username === username);
    if (existingUsername) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Username already taken', status: 400 },
      });
    }

    const id = `usr_${uuidv4().slice(0, 8)}`;
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
      id,
      username,
      email,
      password: hashedPassword,
      walletBalance: 1.0, // Start with demo BTC
      createdAt: new Date().toISOString(),
    };

    db.users.set(id, user);

    const { accessToken, refreshToken } = generateTokens(user);
    const { password: _, ...safeUser } = user;

    logger.audit('auth', `User registered: ${username}`, { userId: id, email });

    res.status(201).json({ token: accessToken, refreshToken, user: safeUser });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = [...db.users.values()].find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials', status: 401 },
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    const { password: _, ...safeUser } = user;

    logger.audit('auth', `User logged in: ${user.username}`, { userId: user.id });

    res.json({ token: accessToken, refreshToken, user: safeUser });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/refresh
router.post('/refresh', (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({
        error: { code: 'BAD_REQUEST', message: 'Refresh token required', status: 400 },
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    const user = db.users.get(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'User not found', status: 401 },
      });
    }

    const tokens = generateTokens(user);

    // Blacklist the old refresh token
    db.tokenBlacklist.add(decoded.jti);

    logger.info('auth', `Token refreshed for: ${user.username}`, { userId: user.id });

    res.json({ token: tokens.accessToken, refreshToken: tokens.refreshToken });
  } catch (err) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid refresh token', status: 401 },
    });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      db.tokenBlacklist.add(decoded.jti);
      logger.audit('auth', `User logged out`, { userId: decoded.id });
    } catch {
      // Token already invalid — that's fine, still return success
    }
  }
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const user = db.users.get(req.user.id);
  if (!user) {
    return res.status(404).json({
      error: { code: 'USER_NOT_FOUND', message: 'User not found', status: 404 },
    });
  }
  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

module.exports = router;
