const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/wallet/balance
router.get('/balance', authenticate, (req, res) => {
  const user = db.users.get(req.user.id);
  if (!user) {
    return res.status(404).json({
      error: { code: 'USER_NOT_FOUND', message: 'User not found', status: 404 },
    });
  }
  res.json({ balance: user.walletBalance });
});

// GET /api/wallet/transactions
router.get('/transactions', authenticate, (req, res) => {
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
  res.json(transactions);
});

module.exports = router;
