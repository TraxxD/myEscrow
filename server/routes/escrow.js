const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const validate = require('../middleware/validate');
const { strictLimiter } = require('../middleware/rateLimiter');
const {
  createEscrowSchema,
  fundEscrowSchema,
  deliverSchema,
  shipSchema,
  rejectSchema,
  returnShipSchema,
  disputeSchema,
  resolveSchema,
  messageSchema,
} = require('../utils/schemas');
const { logAudit } = require('../services/auditLog');
const { generateEscrowAddress, btcToSatoshis } = require('../services/bitcoin');
const logger = require('../utils/logger');

const router = express.Router();

// ─── Helper: get escrow or 404 ───
function getEscrowOr404(id, res) {
  const escrow = db.escrows.getById(id);
  if (!escrow) {
    res.status(404).json({ error: { code: 'ESCROW_NOT_FOUND', message: `Escrow ${id} not found`, status: 404 } });
    return null;
  }
  return escrow;
}

// POST /api/escrows — Create a new escrow
router.post('/', authenticate, validate(createEscrowSchema), (req, res, next) => {
  try {
    const { title, description, amount, sellerUsername, expiresInDays, category, inspectionDays } = req.body;

    const seller = db.users.getByUsername(sellerUsername);
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

    // Generate Bitcoin multisig address
    const derivationIndex = db.escrows.getNextDerivationIndex();
    const addressInfo = generateEscrowAddress(derivationIndex);

    const escrow = {
      id: `esc_${uuidv4().slice(0, 8)}`,
      title,
      description: description || '',
      amount,
      status: 'AWAITING_AGREEMENT',
      buyer: req.user.username,
      buyerId: req.user.id,
      seller: sellerUsername,
      sellerId: seller.id,
      arbiter: 'system',
      escrowAddress: addressInfo.address,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + expiresInDays * 86400000).toISOString(),
      history: [{ action: 'CREATED', by: req.user.username, at: new Date().toISOString() }],
      category: category || null,
      inspectionDays: inspectionDays || 3,
      buyerPubKey: addressInfo.buyerPubKey,
      sellerPubKey: addressInfo.sellerPubKey,
      platformPubKey: addressInfo.platformPubKey,
      redeemScript: addressInfo.redeemScript,
      derivationIndex: addressInfo.derivationIndex,
      amountSatoshis: btcToSatoshis(amount),
      platformFee: 0,
    };

    db.escrows.create(escrow);

    logAudit({
      userId: req.user.id,
      action: 'CREATE_ESCROW',
      resource: 'escrow',
      resourceId: escrow.id,
      details: { buyer: req.user.username, seller: sellerUsername, amount, category },
      ip: req.clientIp,
    });

    // Notify both parties
    const buyer = db.users.getById(req.user.id);
    [buyer, seller].filter(Boolean).forEach(user => {
      db.emailQueue.enqueue({
        to_email: user.email,
        subject: `New escrow created: ${title}`,
        template: 'escrowCreated',
        templateData: { username: user.username, escrowId: escrow.id, title, amount },
      });
    });

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
    const escrows = db.escrows.getForUser(req.user.id, { status, role });

    const start = (page - 1) * limit;
    res.json(escrows.slice(start, start + parseInt(limit)));
  } catch (err) {
    next(err);
  }
});

// GET /api/escrows/:id — Get escrow details
router.get('/:id', authenticate, (req, res, next) => {
  try {
    const escrow = getEscrowOr404(req.params.id, res);
    if (!escrow) return;
    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// POST /api/escrows/:id/agree — Each party agrees to terms
router.post('/:id/agree', authenticate, (req, res, next) => {
  try {
    const escrow = getEscrowOr404(req.params.id, res);
    if (!escrow) return;

    if (escrow.status !== 'AWAITING_AGREEMENT') {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: `Cannot agree in ${escrow.status} state`, status: 400 },
      });
    }

    const isBuyer = escrow.buyerId === req.user.id;
    const isSeller = escrow.sellerId === req.user.id;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only buyer or seller can agree', status: 403 },
      });
    }

    if (isBuyer) {
      if (escrow.buyerAgreed) {
        return res.status(400).json({
          error: { code: 'ALREADY_AGREED', message: 'Buyer has already agreed', status: 400 },
        });
      }
      escrow.buyerAgreed = 1;
      escrow.history.push({ action: 'BUYER_AGREED', by: req.user.username, at: new Date().toISOString() });
    }

    if (isSeller) {
      if (escrow.sellerAgreed) {
        return res.status(400).json({
          error: { code: 'ALREADY_AGREED', message: 'Seller has already agreed', status: 400 },
        });
      }
      escrow.sellerAgreed = 1;
      escrow.history.push({ action: 'SELLER_AGREED', by: req.user.username, at: new Date().toISOString() });
    }

    // If both agreed, move to CREATED (ready for funding)
    if (escrow.buyerAgreed && escrow.sellerAgreed) {
      escrow.status = 'CREATED';
      escrow.history.push({ action: 'BOTH_AGREED', by: 'system', at: new Date().toISOString() });
    }

    db.escrows.update(escrow);

    logAudit({
      userId: req.user.id,
      action: 'AGREE_ESCROW',
      resource: 'escrow',
      resourceId: escrow.id,
      details: { role: isBuyer ? 'buyer' : 'seller' },
      ip: req.clientIp,
    });

    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// POST /api/escrows/:id/fund — Buyer deposits BTC
router.post('/:id/fund', authenticate, validate(fundEscrowSchema), (req, res, next) => {
  try {
    const escrow = getEscrowOr404(req.params.id, res);
    if (!escrow) return;

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

    const buyer = db.users.getById(req.user.id);
    if (buyer.walletBalance < escrow.amount) {
      return res.status(400).json({
        error: { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient wallet balance', status: 400 },
      });
    }

    // Deduct from buyer
    db.users.updateBalance(buyer.id, buyer.walletBalance - escrow.amount);

    // Update escrow
    escrow.status = 'FUNDED';
    escrow.fundedAt = new Date().toISOString();
    escrow.txHash = `tx_${uuidv4().replace(/-/g, '')}`;
    escrow.history.push({ action: 'FUNDED', by: req.user.username, at: escrow.fundedAt });
    db.escrows.update(escrow);

    // Record deposit watch for on-chain monitoring
    if (escrow.escrowAddress && escrow.amountSatoshis) {
      db.deposits.watch({
        escrowId: escrow.id,
        address: escrow.escrowAddress,
        expectedSatoshis: escrow.amountSatoshis,
      });
    }

    logAudit({
      userId: req.user.id,
      action: 'FUND_ESCROW',
      resource: 'escrow',
      resourceId: escrow.id,
      details: { amount: escrow.amount },
      ip: req.clientIp,
    });

    // Notify seller
    const seller = db.users.getById(escrow.sellerId);
    if (seller) {
      db.emailQueue.enqueue({
        to_email: seller.email,
        subject: `Escrow ${escrow.id} has been funded`,
        template: 'escrowFunded',
        templateData: { username: seller.username, escrowId: escrow.id, amount: escrow.amount, title: escrow.title },
      });
    }

    logger.audit('escrow', `Escrow funded: ${escrow.id}`, {
      buyer: req.user.username, amount: escrow.amount,
    });

    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// POST /api/escrows/:id/ship — Seller ships item (new escrow.com-style)
router.post('/:id/ship', authenticate, validate(shipSchema), (req, res, next) => {
  try {
    const escrow = getEscrowOr404(req.params.id, res);
    if (!escrow) return;

    if (escrow.status !== 'FUNDED') {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: `Cannot ship in ${escrow.status} state`, status: 400 },
      });
    }
    if (escrow.sellerId !== req.user.id) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only the seller can ship', status: 403 },
      });
    }

    escrow.status = 'SHIPPED';
    escrow.deliveredAt = new Date().toISOString();
    escrow.trackingInfo = req.body.trackingInfo;
    escrow.deliveryNotes = req.body.notes || null;
    escrow.history.push({ action: 'SHIPPED', by: req.user.username, at: escrow.deliveredAt });
    db.escrows.update(escrow);

    logAudit({
      userId: req.user.id,
      action: 'SHIP_ESCROW',
      resource: 'escrow',
      resourceId: escrow.id,
      details: { trackingInfo: req.body.trackingInfo },
      ip: req.clientIp,
    });

    // Notify buyer
    const buyer = db.users.getById(escrow.buyerId);
    if (buyer) {
      db.emailQueue.enqueue({
        to_email: buyer.email,
        subject: `Item shipped for escrow ${escrow.id}`,
        template: 'escrowShipped',
        templateData: {
          username: buyer.username, escrowId: escrow.id,
          title: escrow.title, trackingInfo: req.body.trackingInfo,
        },
      });
    }

    logger.audit('escrow', `Escrow shipped: ${escrow.id}`, { seller: req.user.username });

    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// POST /api/escrows/:id/deliver — BACKWARD COMPAT alias for /ship
router.post('/:id/deliver', authenticate, validate(deliverSchema), (req, res, next) => {
  try {
    const escrow = getEscrowOr404(req.params.id, res);
    if (!escrow) return;

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

    escrow.status = 'SHIPPED';
    escrow.deliveredAt = new Date().toISOString();
    escrow.trackingInfo = req.body.trackingInfo || null;
    escrow.deliveryNotes = req.body.notes || null;
    escrow.history.push({ action: 'SHIPPED', by: req.user.username, at: escrow.deliveredAt });
    db.escrows.update(escrow);

    logAudit({
      userId: req.user.id,
      action: 'DELIVER_ESCROW',
      resource: 'escrow',
      resourceId: escrow.id,
      ip: req.clientIp,
    });

    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// POST /api/escrows/:id/receive — Buyer marks received, starts inspection
router.post('/:id/receive', authenticate, (req, res, next) => {
  try {
    const escrow = getEscrowOr404(req.params.id, res);
    if (!escrow) return;

    if (escrow.status !== 'SHIPPED') {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: `Cannot receive in ${escrow.status} state`, status: 400 },
      });
    }
    if (escrow.buyerId !== req.user.id) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only the buyer can mark as received', status: 403 },
      });
    }

    const inspectionDays = escrow.inspectionDays || 3;
    escrow.status = 'INSPECTION';
    escrow.inspectionDeadline = new Date(Date.now() + inspectionDays * 86400000).toISOString();
    escrow.history.push({
      action: 'RECEIVED',
      by: req.user.username,
      at: new Date().toISOString(),
      details: `Inspection period: ${inspectionDays} day(s)`,
    });
    db.escrows.update(escrow);

    logAudit({
      userId: req.user.id,
      action: 'RECEIVE_ESCROW',
      resource: 'escrow',
      resourceId: escrow.id,
      details: { inspectionDeadline: escrow.inspectionDeadline },
      ip: req.clientIp,
    });

    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// POST /api/escrows/:id/accept — Buyer accepts during inspection
router.post('/:id/accept', authenticate, (req, res, next) => {
  try {
    const escrow = getEscrowOr404(req.params.id, res);
    if (!escrow) return;

    // Allow accept from INSPECTION or DELIVERED (backward compat)
    if (!['INSPECTION', 'DELIVERED'].includes(escrow.status)) {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: `Cannot accept in ${escrow.status} state`, status: 400 },
      });
    }
    if (escrow.buyerId !== req.user.id) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only the buyer can accept', status: 403 },
      });
    }

    // Credit seller (2% platform fee)
    const seller = db.users.getByUsername(escrow.seller);
    const fee = escrow.amount * 0.02;
    db.users.updateBalance(seller.id, seller.walletBalance + escrow.amount - fee);

    // Record fee
    db.fees.record({
      escrowId: escrow.id,
      feeType: 'escrow_fee',
      amountBtc: fee,
    });

    escrow.status = 'RELEASED';
    escrow.releasedAt = new Date().toISOString();
    escrow.platformFee = fee;
    escrow.history.push({ action: 'ACCEPTED', by: req.user.username, at: escrow.releasedAt });
    escrow.history.push({ action: 'RELEASED', by: 'system', at: escrow.releasedAt });
    db.escrows.update(escrow);

    logAudit({
      userId: req.user.id,
      action: 'ACCEPT_ESCROW',
      resource: 'escrow',
      resourceId: escrow.id,
      details: { amount: escrow.amount, fee },
      ip: req.clientIp,
    });

    // Notify both parties
    const buyer = db.users.getById(escrow.buyerId);
    [buyer, seller].filter(Boolean).forEach(user => {
      db.emailQueue.enqueue({
        to_email: user.email,
        subject: `Escrow ${escrow.id} accepted — funds released`,
        template: 'escrowAccepted',
        templateData: { username: user.username, escrowId: escrow.id, title: escrow.title },
      });
    });

    logger.audit('escrow', `Escrow accepted & released: ${escrow.id}`, {
      buyer: req.user.username, seller: escrow.seller, amount: escrow.amount,
    });

    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// POST /api/escrows/:id/release — BACKWARD COMPAT alias for /accept
router.post('/:id/release', authenticate, (req, res, next) => {
  try {
    const escrow = getEscrowOr404(req.params.id, res);
    if (!escrow) return;

    // Accept from DELIVERED or INSPECTION (backward compat with old status)
    if (!['DELIVERED', 'INSPECTION'].includes(escrow.status)) {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: `Cannot release in ${escrow.status} state`, status: 400 },
      });
    }
    if (escrow.buyerId !== req.user.id) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only the buyer can release funds', status: 403 },
      });
    }

    // Credit seller (minus 2% fee)
    const seller = db.users.getByUsername(escrow.seller);
    const fee = escrow.amount * 0.02;
    db.users.updateBalance(seller.id, seller.walletBalance + escrow.amount - fee);

    db.fees.record({
      escrowId: escrow.id,
      feeType: 'escrow_fee',
      amountBtc: fee,
    });

    escrow.status = 'RELEASED';
    escrow.releasedAt = new Date().toISOString();
    escrow.platformFee = fee;
    escrow.history.push({ action: 'RELEASED', by: req.user.username, at: escrow.releasedAt });
    db.escrows.update(escrow);

    logAudit({
      userId: req.user.id,
      action: 'RELEASE_ESCROW',
      resource: 'escrow',
      resourceId: escrow.id,
      details: { amount: escrow.amount, fee },
      ip: req.clientIp,
    });

    logger.audit('escrow', `Escrow released: ${escrow.id}`, {
      buyer: req.user.username, seller: escrow.seller, amount: escrow.amount,
    });

    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// POST /api/escrows/:id/reject — Buyer rejects during inspection
router.post('/:id/reject', authenticate, validate(rejectSchema), (req, res, next) => {
  try {
    const escrow = getEscrowOr404(req.params.id, res);
    if (!escrow) return;

    if (escrow.status !== 'INSPECTION') {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: `Cannot reject in ${escrow.status} state`, status: 400 },
      });
    }
    if (escrow.buyerId !== req.user.id) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only the buyer can reject', status: 403 },
      });
    }

    escrow.status = 'REJECTED';
    escrow.rejectionReason = req.body.reason;
    escrow.history.push({ action: 'REJECTED', by: req.user.username, at: new Date().toISOString(), details: req.body.reason });
    db.escrows.update(escrow);

    logAudit({
      userId: req.user.id,
      action: 'REJECT_ESCROW',
      resource: 'escrow',
      resourceId: escrow.id,
      details: { reason: req.body.reason },
      ip: req.clientIp,
    });

    // Notify seller
    const seller = db.users.getById(escrow.sellerId);
    if (seller) {
      db.emailQueue.enqueue({
        to_email: seller.email,
        subject: `Escrow ${escrow.id} rejected by buyer`,
        template: 'escrowRejected',
        templateData: {
          username: seller.username, escrowId: escrow.id,
          title: escrow.title, reason: req.body.reason,
        },
      });
    }

    logger.audit('escrow', `Escrow rejected: ${escrow.id}`, { buyer: req.user.username, reason: req.body.reason });

    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// POST /api/escrows/:id/return-ship — Buyer ships rejected item back
router.post('/:id/return-ship', authenticate, validate(returnShipSchema), (req, res, next) => {
  try {
    const escrow = getEscrowOr404(req.params.id, res);
    if (!escrow) return;

    if (escrow.status !== 'REJECTED') {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: `Cannot return-ship in ${escrow.status} state`, status: 400 },
      });
    }
    if (escrow.buyerId !== req.user.id) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only the buyer can return-ship', status: 403 },
      });
    }

    escrow.status = 'RETURN_SHIPPED';
    escrow.returnTrackingInfo = req.body.trackingInfo;
    escrow.history.push({
      action: 'RETURN_SHIPPED',
      by: req.user.username,
      at: new Date().toISOString(),
      details: `Return tracking: ${req.body.trackingInfo}`,
    });
    db.escrows.update(escrow);

    logAudit({
      userId: req.user.id,
      action: 'RETURN_SHIP',
      resource: 'escrow',
      resourceId: escrow.id,
      details: { trackingInfo: req.body.trackingInfo },
      ip: req.clientIp,
    });

    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// POST /api/escrows/:id/refund — Seller confirms return receipt, refund buyer
router.post('/:id/refund', authenticate, (req, res, next) => {
  try {
    const escrow = getEscrowOr404(req.params.id, res);
    if (!escrow) return;

    if (escrow.status !== 'RETURN_SHIPPED') {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: `Cannot refund in ${escrow.status} state`, status: 400 },
      });
    }
    if (escrow.sellerId !== req.user.id) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only the seller can confirm return receipt', status: 403 },
      });
    }

    // Refund buyer
    const buyer = db.users.getById(escrow.buyerId);
    db.users.updateBalance(buyer.id, buyer.walletBalance + escrow.amount);

    escrow.status = 'REFUNDED';
    escrow.releasedAt = new Date().toISOString();
    escrow.history.push({ action: 'REFUNDED', by: req.user.username, at: escrow.releasedAt });
    db.escrows.update(escrow);

    logAudit({
      userId: req.user.id,
      action: 'REFUND_ESCROW',
      resource: 'escrow',
      resourceId: escrow.id,
      details: { amount: escrow.amount },
      ip: req.clientIp,
    });

    logger.audit('escrow', `Escrow refunded: ${escrow.id}`, {
      seller: req.user.username, buyer: escrow.buyer, amount: escrow.amount,
    });

    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// POST /api/escrows/:id/dispute — Open a dispute
router.post('/:id/dispute', authenticate, validate(disputeSchema), (req, res, next) => {
  try {
    const escrow = getEscrowOr404(req.params.id, res);
    if (!escrow) return;

    if (!['FUNDED', 'SHIPPED', 'DELIVERED', 'INSPECTION', 'REJECTED'].includes(escrow.status)) {
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
    db.escrows.update(escrow);

    logAudit({
      userId: req.user.id,
      action: 'DISPUTE_ESCROW',
      resource: 'escrow',
      resourceId: escrow.id,
      details: { reason: req.body.reason },
      ip: req.clientIp,
    });

    // Notify both parties
    const buyer = db.users.getById(escrow.buyerId);
    const seller = db.users.getById(escrow.sellerId);
    [buyer, seller].filter(Boolean).forEach(user => {
      db.emailQueue.enqueue({
        to_email: user.email,
        subject: `Dispute opened for escrow ${escrow.id}`,
        template: 'escrowDisputed',
        templateData: {
          username: user.username, escrowId: escrow.id, title: escrow.title,
          openedBy: req.user.username, reason: req.body.reason,
        },
      });
    });

    logger.audit('escrow', `Escrow disputed: ${escrow.id}`, {
      by: req.user.username, reason: req.body.reason,
    });

    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// POST /api/escrows/:id/resolve — Admin resolves dispute
router.post('/:id/resolve', authenticate, requireAdmin, strictLimiter, validate(resolveSchema), (req, res, next) => {
  try {
    const escrow = getEscrowOr404(req.params.id, res);
    if (!escrow) return;

    if (escrow.status !== 'DISPUTED') {
      return res.status(400).json({
        error: { code: 'INVALID_STATE', message: `Cannot resolve in ${escrow.status} state`, status: 400 },
      });
    }

    const { ruling, splitPercentage, notes } = req.body;

    const recipient = ruling === 'BUYER'
      ? db.users.getById(escrow.buyerId)
      : db.users.getByUsername(escrow.seller);

    // Credit recipient (minus 3% dispute fee)
    const fee = escrow.amount * 0.03;
    const payout = escrow.amount * (splitPercentage / 100) - fee;
    db.users.updateBalance(recipient.id, recipient.walletBalance + payout);

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

    // Notify both parties
    const buyer = db.users.getById(escrow.buyerId);
    const seller = db.users.getById(escrow.sellerId);
    [buyer, seller].filter(Boolean).forEach(user => {
      db.emailQueue.enqueue({
        to_email: user.email,
        subject: `Escrow ${escrow.id} dispute resolved`,
        template: 'escrowResolved',
        templateData: {
          username: user.username, escrowId: escrow.id, title: escrow.title,
          ruling, notes: notes || 'No additional notes',
        },
      });
    });

    logger.audit('escrow', `Escrow resolved: ${escrow.id}`, {
      ruling, splitPercentage, amount: escrow.amount,
    });

    res.json(escrow);
  } catch (err) {
    next(err);
  }
});

// GET /api/escrows/:id/messages — Get chat messages for escrow
router.get('/:id/messages', authenticate, (req, res, next) => {
  try {
    const escrow = getEscrowOr404(req.params.id, res);
    if (!escrow) return;

    // Only buyer/seller/admin can view messages
    const user = db.users.getById(req.user.id);
    if (escrow.buyerId !== req.user.id && escrow.sellerId !== req.user.id && user?.role !== 'admin') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only escrow parties can view messages', status: 403 },
      });
    }

    const messages = db.messages.getByEscrow(escrow.id);
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

// POST /api/escrows/:id/messages — Send message in escrow chat
router.post('/:id/messages', authenticate, validate(messageSchema), (req, res, next) => {
  try {
    const escrow = getEscrowOr404(req.params.id, res);
    if (!escrow) return;

    // Only buyer/seller/admin can send messages
    const user = db.users.getById(req.user.id);
    if (escrow.buyerId !== req.user.id && escrow.sellerId !== req.user.id && user?.role !== 'admin') {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Only escrow parties can send messages', status: 403 },
      });
    }

    db.messages.create({
      escrowId: escrow.id,
      senderId: req.user.id,
      senderUsername: req.user.username,
      body: req.body.body,
    });

    const messages = db.messages.getByEscrow(escrow.id);
    res.status(201).json(messages);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
