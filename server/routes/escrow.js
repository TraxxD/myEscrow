const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { strictLimiter } = require('../middleware/rateLimiter');
const {
  createEscrowSchema,
  fundEscrowSchema,
  deliverSchema,
  disputeSchema,
  resolveSchema,
} = require('../utils/schemas');
const logger = require('../utils/logger');

const router = express.Router();

// POST /api/escrows — Create a new escrow
router.post('/', authenticate, validate(createEscrowSchema), (req, res, next) => {
  try {
    const { title, description, amount, sellerUsername, expiresInDays } = req.body;

    const seller = [...db.users.values()].find(u => u.username === sellerUsername);
    if (!seller) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'Seller not found', status: 404 },
      });
    }

    if (seller.id === req.user.id) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Cannot create escrow with yourself', status: 400 },
      });
    }

    const escrow = {
      id: `esc_${uuidv4().slice(0, 8)}`,
      title,
      description: description || '',
      amount,
      status: 'CREATED',
      buyer: req.user.username,
      buyerId: req.user.id,
      seller: sellerUsername,
      sellerId: seller.id,
      arbiter: 'system',
      escrowAddress: `3${uuidv4().replace(/-/g, '').slice(0, 33)}`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiresInDays * 86400000).toISOString(),
      history: [{ action: 'CREATED', by: req.user.username, at: new Date().toISOString() }],
    };

    db.escrows.set(escrow.id, escrow);

    logger.audit('escrow', `Escrow created: ${escrow.id}`, {
      buyer: req.user.username, seller: sellerUsername, amount,
    });

    res.status(201).json(escrow);
  } catch (err) {
    next(err);
  }
});

// GET /api/escrows — List all escrows for current user
router.get('/', authenticate, (req, res, next) => {
  try {
    const { status, role, page = 1, limit = 20 } = req.query;
    let escrows = [...db.escrows.values()].filter(
      e => e.buyerId === req.user.id || e.sellerId === req.user.id
    );

    if (status) {
      escrows = escrows.filter(e => e.status === status);
    }
    if (role === 'buyer') {
      escrows = escrows.filter(e => e.buyerId === req.user.id);
    } else if (role === 'seller') {
      escrows = escrows.filter(e => e.sellerId === req.user.id);
    }

    const start = (page - 1) * limit;
    res.json(escrows.slice(start, start + parseInt(limit)));
  } catch (err) {
    next(err);
  }
});

// GET /api/escrows/:id — Get escrow details
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const escrow = db.escrows.get(req.params.id);
    if (!escrow) {
      return res.status(404).json({
        error: { code: 'ESCROW_NOT_FOUND', message: `Escrow ${req.params.id} not found`, status: 404 },
      });
    }
    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// POST /api/escrows/:id/fund — Buyer deposits BTC
router.post('/:id/fund', authenticate, validate(fundEscrowSchema), (req, res, next) => {
  try {
    const escrow = db.escrows.get(req.params.id);
    if (!escrow) {
      return res.status(404).json({ error: { code: 'ESCROW_NOT_FOUND', status: 404 } });
    }
    if (escrow.status !== 'CREATED') {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: `Cannot fund escrow in ${escrow.status} state`, status: 400 },
      });
    }
    if (escrow.buyerId !== req.user.id) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only the buyer can fund this escrow', status: 403 },
      });
    }

    const buyer = db.users.get(req.user.id);
    if (buyer.walletBalance < escrow.amount) {
      return res.status(400).json({
        error: { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient wallet balance', status: 400 },
      });
    }

    buyer.walletBalance -= escrow.amount;
    escrow.status = 'FUNDED';
    escrow.fundedAt = new Date().toISOString();
    escrow.txHash = `tx_${uuidv4().replace(/-/g, '')}`;
    escrow.history.push({ action: 'FUNDED', by: req.user.username, at: escrow.fundedAt });

    logger.audit('escrow', `Escrow funded: ${escrow.id}`, {
      buyer: req.user.username, amount: escrow.amount,
    });

    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// POST /api/escrows/:id/deliver — Seller marks as delivered
router.post('/:id/deliver', authenticate, validate(deliverSchema), (req, res, next) => {
  try {
    const escrow = db.escrows.get(req.params.id);
    if (!escrow) {
      return res.status(404).json({ error: { code: 'ESCROW_NOT_FOUND', status: 404 } });
    }
    if (escrow.status !== 'FUNDED') {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: `Cannot deliver in ${escrow.status} state`, status: 400 },
      });
    }
    if (escrow.sellerId !== req.user.id) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only the seller can mark as delivered', status: 403 },
      });
    }

    escrow.status = 'DELIVERED';
    escrow.deliveredAt = new Date().toISOString();
    escrow.trackingInfo = req.body.trackingInfo || null;
    escrow.deliveryNotes = req.body.notes || null;
    escrow.history.push({ action: 'DELIVERED', by: req.user.username, at: escrow.deliveredAt });

    logger.audit('escrow', `Escrow delivered: ${escrow.id}`, {
      seller: req.user.username,
    });

    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// POST /api/escrows/:id/release — Buyer confirms receipt
router.post('/:id/release', authenticate, (req, res, next) => {
  try {
    const escrow = db.escrows.get(req.params.id);
    if (!escrow) {
      return res.status(404).json({ error: { code: 'ESCROW_NOT_FOUND', status: 404 } });
    }
    if (escrow.status !== 'DELIVERED') {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: `Cannot release in ${escrow.status} state`, status: 400 },
      });
    }
    if (escrow.buyerId !== req.user.id) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only the buyer can release funds', status: 403 },
      });
    }

    const seller = [...db.users.values()].find(u => u.username === escrow.seller);
    seller.walletBalance += escrow.amount * 0.98; // 2% service fee

    escrow.status = 'RELEASED';
    escrow.releasedAt = new Date().toISOString();
    escrow.history.push({ action: 'RELEASED', by: req.user.username, at: escrow.releasedAt });

    logger.audit('escrow', `Escrow released: ${escrow.id}`, {
      buyer: req.user.username, seller: escrow.seller, amount: escrow.amount,
    });

    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// POST /api/escrows/:id/dispute — Open a dispute
router.post('/:id/dispute', authenticate, validate(disputeSchema), (req, res, next) => {
  try {
    const escrow = db.escrows.get(req.params.id);
    if (!escrow) {
      return res.status(404).json({ error: { code: 'ESCROW_NOT_FOUND', status: 404 } });
    }
    if (!['FUNDED', 'DELIVERED'].includes(escrow.status)) {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: `Cannot dispute in ${escrow.status} state`, status: 400 },
      });
    }
    if (escrow.buyerId !== req.user.id && escrow.sellerId !== req.user.id) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only buyer or seller can open a dispute', status: 403 },
      });
    }

    escrow.status = 'DISPUTED';
    escrow.dispute = {
      reason: req.body.reason,
      evidence: req.body.evidence || null,
      openedBy: req.user.username,
      openedAt: new Date().toISOString(),
    };
    escrow.history.push({ action: 'DISPUTED', by: req.user.username, at: escrow.dispute.openedAt });

    logger.audit('escrow', `Escrow disputed: ${escrow.id}`, {
      by: req.user.username, reason: req.body.reason,
    });

    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// POST /api/escrows/:id/resolve — Arbiter resolves dispute
router.post('/:id/resolve', authenticate, strictLimiter, validate(resolveSchema), (req, res, next) => {
  try {
    const escrow = db.escrows.get(req.params.id);
    if (!escrow) {
      return res.status(404).json({ error: { code: 'ESCROW_NOT_FOUND', status: 404 } });
    }
    if (escrow.status !== 'DISPUTED') {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: `Cannot resolve in ${escrow.status} state`, status: 400 },
      });
    }

    const { ruling, splitPercentage, notes } = req.body;

    const recipient =
      ruling === 'BUYER'
        ? db.users.get(escrow.buyerId)
        : [...db.users.values()].find(u => u.username === escrow.seller);

    recipient.walletBalance += escrow.amount * (splitPercentage / 100) * 0.97; // 3% dispute fee

    escrow.status = 'RESOLVED';
    escrow.resolution = {
      ruling,
      splitPercentage,
      notes: notes || null,
      resolvedAt: new Date().toISOString(),
    };
    escrow.history.push({ action: 'RESOLVED', by: 'arbiter', at: escrow.resolution.resolvedAt });

    logger.audit('escrow', `Escrow resolved: ${escrow.id}`, {
      ruling, splitPercentage, amount: escrow.amount,
    });

    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
