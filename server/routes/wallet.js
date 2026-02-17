const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/wallet/balance
router.get('/balance', authenticate, (req, res, next) => {
  try {
    const user = db.users.get(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found', status: 404 },
      });
    }

    logger.info('wallet', `Balance query`, { userId: req.user.id });

    res.json({ balance: user.walletBalance });
  } catch (err) {
    next(err);
  }
});

// GET /api/wallet/transactions
router.get('/transactions', authenticate, (req, res, next) => {
  try {
    const userEscrows = [...db.escrows.values()].filter(
      e => e.buyerId === req.user.id || e.sellerId === req.user.id
    );

    const transactions = [];
    for (const escrow of userEscrows) {
      if (escrow.fundedAt && escrow.buyerId === req.user.id) {
        transactions.push({
          id: `tx_fund_${escrow.id}`,
          type: 'ESCROW_FUND',
          amount: -escrow.amount,
          escrowId: escrow.id,
          escrowTitle: escrow.title,
          timestamp: escrow.fundedAt,
        });
      }
      if (escrow.releasedAt && escrow.sellerId === req.user.id) {
        transactions.push({
          id: `tx_release_${escrow.id}`,
          type: 'ESCROW_RELEASE',
          amount: escrow.amount * 0.98,
          escrowId: escrow.id,
          escrowTitle: escrow.title,
          timestamp: escrow.releasedAt,
        });
      }
    }

    transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    logger.info('wallet', `Transactions query`, { userId: req.user.id, count: transactions.length });

    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
