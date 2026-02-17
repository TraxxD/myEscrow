const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { getAddressBalance, satoshisToBtc, isInitialized } = require('../services/bitcoin');
const logger = require('../utils/logger');

const router = express.Router();

// GET /api/wallet/balance
router.get('/balance', authenticate, async (req, res, next) => {
  try {
    const user = db.users.getById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: { code: 'USER_NOT_FOUND', message: 'User not found', status: 404 },
      });
    }

    logger.info('wallet', `Balance query`, { userId: req.user.id });

    res.json({
      balance: user.walletBalance,
      btcNetwork: process.env.BTC_NETWORK || 'testnet',
      btcEnabled: require('../services/bitcoin').isInitialized,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/wallet/transactions
router.get('/transactions', authenticate, (req, res, next) => {
  try {
    const userEscrows = db.escrows.getForUser(req.user.id);

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
        const feeRate = escrow.status === 'RESOLVED' ? 0.97 : 0.98;
        transactions.push({
          id: `tx_release_${escrow.id}`,
          type: 'ESCROW_RELEASE',
          amount: escrow.amount * feeRate,
          escrowId: escrow.id,
          escrowTitle: escrow.title,
          timestamp: escrow.releasedAt,
        });
      }
      if (escrow.status === 'REFUNDED' && escrow.buyerId === req.user.id) {
        transactions.push({
          id: `tx_refund_${escrow.id}`,
          type: 'ESCROW_REFUND',
          amount: escrow.amount,
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

// GET /api/wallet/escrow-balance/:escrowId — Check on-chain balance for an escrow
router.get('/escrow-balance/:escrowId', authenticate, async (req, res, next) => {
  try {
    const escrow = db.escrows.getById(req.params.escrowId);
    if (!escrow) {
      return res.status(404).json({
        error: { code: 'ESCROW_NOT_FOUND', message: 'Escrow not found', status: 404 },
      });
    }

    if (!escrow.escrowAddress) {
      return res.json({ confirmed: 0, unconfirmed: 0, address: null });
    }

    const balance = await getAddressBalance(escrow.escrowAddress);
    res.json({
      address: escrow.escrowAddress,
      confirmed: balance ? satoshisToBtc(balance.confirmed) : 0,
      unconfirmed: balance ? satoshisToBtc(balance.unconfirmed) : 0,
      confirmedSatoshis: balance ? balance.confirmed : 0,
      unconfirmedSatoshis: balance ? balance.unconfirmed : 0,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
