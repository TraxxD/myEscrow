const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const validate = require('../middleware/validate');
const { resolveSchema, updateRoleSchema } = require('../utils/schemas');
const { logAudit } = require('../services/auditLog');
const logger = require('../utils/logger');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/stats — Dashboard statistics
router.get('/stats', (req, res, next) => {
  try {
    const stats = db.stats.get();
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/disputes — List all disputed escrows
router.get('/disputes', (req, res, next) => {
  try {
    const disputed = db.escrows.getByStatus('DISPUTED');
    res.json(disputed);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/disputes/:id/resolve — Resolve a disputed escrow
router.post('/disputes/:id/resolve', validate(resolveSchema), (req, res, next) => {
  try {
    const escrow = db.escrows.getById(req.params.id);
    if (!escrow) {
      return res.status(404).json({ error: { code: 'ESCROW_NOT_FOUND', message: 'Escrow not found', status: 404 } });
    }
    if (escrow.status !== 'DISPUTED') {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: `Cannot resolve in ${escrow.status} state`, status: 400 },
      });
    }

    const { ruling, splitPercentage, notes } = req.body;

    const recipient = ruling === 'BUYER'
      ? db.users.getById(escrow.buyerId)
      : db.users.getByUsername(escrow.seller);

    // Credit recipient (3% dispute fee)
    const fee = escrow.amount * 0.03;
    const payout = escrow.amount * (splitPercentage / 100) - fee;
    db.users.updateBalance(recipient.id, recipient.walletBalance + payout);

    // Record fee
    db.fees.record({
      escrowId: escrow.id,
      feeType: 'dispute_fee',
      amountBtc: fee,
    });

    escrow.status = 'RESOLVED';
    escrow.platformFee = fee;
    escrow.resolution = {
      ruling,
      splitPercentage,
      notes: notes || null,
      resolvedBy: req.user.username,
      resolvedAt: new Date().toISOString(),
    };
    escrow.history.push({ action: 'RESOLVED', by: req.user.username, at: escrow.resolution.resolvedAt });
    db.escrows.update(escrow);

    logAudit({
      userId: req.user.id,
      action: 'RESOLVE_DISPUTE',
      resource: 'escrow',
      resourceId: escrow.id,
      details: { ruling, splitPercentage, notes },
      ip: req.clientIp,
    });

    // Notify parties
    const buyer = db.users.getById(escrow.buyerId);
    const seller = db.users.getById(escrow.sellerId);
    [buyer, seller].filter(Boolean).forEach(user => {
      db.emailQueue.enqueue({
        to_email: user.email,
        subject: `Escrow ${escrow.id} dispute resolved`,
        template: 'escrowResolved',
        templateData: {
          username: user.username,
          escrowId: escrow.id,
          title: escrow.title,
          ruling,
          notes: notes || 'No additional notes',
        },
      });
    });

    logger.audit('admin', `Dispute resolved: ${escrow.id}`, { ruling, splitPercentage, by: req.user.username });

    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/users — List all users (paginated)
router.get('/users', (req, res, next) => {
  try {
    const users = db.users.getAll();
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const start = (page - 1) * limit;

    res.json({
      users: users.slice(start, start + limit),
      total: users.length,
      page,
      totalPages: Math.ceil(users.length / limit),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users/:id/role — Change user role
router.post('/users/:id/role', validate(updateRoleSchema), (req, res, next) => {
  try {
    const user = db.users.getById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User not found', status: 404 } });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Cannot change your own role', status: 400 },
      });
    }

    db.users.updateRole(user.id, req.body.role);

    logAudit({
      userId: req.user.id,
      action: 'CHANGE_ROLE',
      resource: 'user',
      resourceId: user.id,
      details: { from: user.role, to: req.body.role },
      ip: req.clientIp,
    });

    logger.audit('admin', `Role changed: ${user.username} ${user.role} → ${req.body.role}`, { by: req.user.username });

    res.json({ message: `User ${user.username} role changed to ${req.body.role}` });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/fees — Fee revenue breakdown
router.get('/fees', (req, res, next) => {
  try {
    const stats = db.fees.getStats();
    const all = db.fees.getAll();
    res.json({ stats, recent: all.slice(0, 50) });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/audit-log — Query audit trail
router.get('/audit-log', (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const logs = db.audit.getAll(limit, offset);
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/escrows — List all escrows
router.get('/escrows', (req, res, next) => {
  try {
    let escrows = db.escrows.getAll();
    if (req.query.status) {
      escrows = escrows.filter(e => e.status === req.query.status);
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const start = (page - 1) * limit;

    res.json({
      escrows: escrows.slice(start, start + limit),
      total: escrows.length,
      page,
      totalPages: Math.ceil(escrows.length / limit),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
