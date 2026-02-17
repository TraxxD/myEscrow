const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/escrows — Create a new escrow
router.post('/', authenticate, (req, res) => {
  const { title, description, amount, sellerUsername, expiresInDays = 14 } = req.body;

  if (!title || !amount || !sellerUsername) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'title, amount, and sellerUsername are required', status: 422 },
    });
  }

  const seller = [...db.users.values()].find(u => u.username === sellerUsername);
  if (!seller) {
    return res.status(404).json({
      error: { code: 'USER_NOT_FOUND', message: 'Seller not found', status: 404 },
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
  res.status(201).json(escrow);
});

// GET /api/escrows — List all escrows for current user
router.get('/', authenticate, (req, res) => {
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
});

// GET /api/escrows/:id — Get escrow details
router.get('/:id', authenticate, (req, res) => {
  const escrow = db.escrows.get(req.params.id);
  if (!escrow) {
    return res.status(404).json({
      error: { code: 'ESCROW_NOT_FOUND', message: `Escrow ${req.params.id} not found`, status: 404 },
    });
  }
  res.json(escrow);
});

// POST /api/escrows/:id/fund — Buyer deposits BTC
router.post('/:id/fund', authenticate, (req, res) => {
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

  res.json(escrow);
});

// POST /api/escrows/:id/deliver — Seller marks as delivered
router.post('/:id/deliver', authenticate, (req, res) => {
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

  res.json(escrow);
});

// POST /api/escrows/:id/release — Buyer confirms receipt
router.post('/:id/release', authenticate, (req, res) => {
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

  res.json(escrow);
});

// POST /api/escrows/:id/dispute — Open a dispute
router.post('/:id/dispute', authenticate, (req, res) => {
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
    reason: req.body.reason || 'Not specified',
    evidence: req.body.evidence || null,
    openedBy: req.user.username,
    openedAt: new Date().toISOString(),
  };
  escrow.history.push({ action: 'DISPUTED', by: req.user.username, at: escrow.dispute.openedAt });

  res.json(escrow);
});

// POST /api/escrows/:id/resolve — Arbiter resolves dispute
router.post('/:id/resolve', authenticate, (req, res) => {
  const escrow = db.escrows.get(req.params.id);
  if (!escrow) {
    return res.status(404).json({ error: { code: 'ESCROW_NOT_FOUND', status: 404 } });
  }
  if (escrow.status !== 'DISPUTED') {
    return res.status(400).json({
      error: { code: 'INVALID_STATE', message: `Cannot resolve in ${escrow.status} state`, status: 400 },
    });
  }

  const { ruling, splitPercentage = 100, notes } = req.body;

  if (!ruling || !['BUYER', 'SELLER'].includes(ruling)) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'ruling must be BUYER or SELLER', status: 422 },
    });
  }

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

  res.json(escrow);
});

module.exports = router;
