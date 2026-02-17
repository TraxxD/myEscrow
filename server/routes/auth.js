const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../config/db');
const { authenticate, generateTokens, verifyRefreshToken } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../utils/schemas');
const { logAudit } = require('../services/auditLog');
const logger = require('../utils/logger');

const router = express.Router();

// POST /api/auth/register
router.post('/register', authLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // Check for existing email
    const existing = db.users.getByEmail(email);
    if (existing) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Email already registered', status: 400 },
      });
    }

    // Check for existing username
    const existingUsername = db.users.getByUsername(username);
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
      walletBalance: 1.0,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    db.users.create(user);

    const { accessToken, refreshToken } = generateTokens(user);
    const { password: _, ...safeUser } = user;

    logAudit({
      userId: id,
      action: 'REGISTER',
      resource: 'user',
      resourceId: id,
      details: { username, email },
      ip: req.clientIp,
    });

    // Queue welcome email
    db.emailQueue.enqueue({
      to_email: email,
      subject: 'Welcome to SecureEscrow',
      template: 'welcome',
      templateData: { username, loginUrl: 'http://localhost:5173/login' },
    });

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
    const user = db.users.getByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'Invalid credentials', status: 401 },
      });
    }

    const { accessToken, refreshToken } = generateTokens(user);
    const { password: _, ...safeUser } = user;

    logAudit({
      userId: user.id,
      action: 'LOGIN',
      resource: 'user',
      resourceId: user.id,
      ip: req.clientIp,
    });

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
    const user = db.users.getById(decoded.id);
    if (!user) {
      return res.status(401).json({
        error: { code: 'UNAUTHORIZED', message: 'User not found', status: 401 },
      });
    }

    const tokens = generateTokens(user);

    // Blacklist the old refresh token
    db.tokens.blacklist(decoded.jti);

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
      db.tokens.blacklist(decoded.jti);
      logger.audit('auth', `User logged out`, { userId: decoded.id });
    } catch {
      // Token already invalid — that's fine, still return success
    }
  }
  res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const user = db.users.getById(req.user.id);
  if (!user) {
    return res.status(404).json({
      error: { code: 'USER_NOT_FOUND', message: 'User not found', status: 404 },
    });
  }
  const { password: _, ...safeUser } = user;
  res.json({ user: safeUser });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = db.users.getByEmail(email);

    // Always return success (don't reveal if email exists)
    if (!user) {
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    db.users.setResetToken(user.id, resetToken, expiry);

    // Queue password reset email
    db.emailQueue.enqueue({
      to_email: email,
      subject: 'Password Reset Request',
      template: 'passwordReset',
      templateData: { username: user.username, resetToken },
    });

    logAudit({
      userId: user.id,
      action: 'FORGOT_PASSWORD',
      resource: 'user',
      resourceId: user.id,
      ip: req.clientIp,
    });

    logger.info('auth', `Password reset requested for: ${user.username}`);

    res.json({ message: 'If the email exists, a reset link has been sent' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, password } = req.body;

    const user = db.users.getByResetToken(token);
    if (!user) {
      return res.status(400).json({
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired reset token', status: 400 },
      });
    }

    // Check expiry
    if (new Date(user.resetTokenExpiry) < new Date()) {
      db.users.clearResetToken(user.id);
      return res.status(400).json({
        error: { code: 'EXPIRED_TOKEN', message: 'Reset token has expired', status: 400 },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    db.raw.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);
    db.users.clearResetToken(user.id);

    logAudit({
      userId: user.id,
      action: 'RESET_PASSWORD',
      resource: 'user',
      resourceId: user.id,
      ip: req.clientIp,
    });

    logger.audit('auth', `Password reset completed for: ${user.username}`);

    res.json({ message: 'Password has been reset successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
