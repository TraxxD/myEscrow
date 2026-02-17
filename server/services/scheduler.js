const db = require('../config/db');
const { pollDeposits } = require('./depositMonitor');
const { processQueue: processEmailQueue } = require('./email');
const { logAudit } = require('./auditLog');
const logger = require('../utils/logger');

let intervals = [];

/**
 * Auto-accept escrows past inspection deadline
 */
function autoAcceptExpiredInspections() {
  try {
    const now = new Date().toISOString();
    const expired = db.escrows.getExpiredInspection(now);

    for (const escrow of expired) {
      escrow.status = 'ACCEPTED';
      escrow.releasedAt = new Date().toISOString();
      escrow.history.push({
        action: 'AUTO_ACCEPTED',
        by: 'system',
        at: escrow.releasedAt,
        details: 'Inspection period expired without rejection',
      });

      // Release funds to seller (2% platform fee)
      const seller = db.users.getByUsername(escrow.seller);
      if (seller) {
        const fee = escrow.amount * 0.02;
        db.users.updateBalance(seller.id, seller.walletBalance + escrow.amount - fee);
        db.fees.record({
          escrowId: escrow.id,
          feeType: 'escrow_fee',
          amountBtc: fee,
        });
        escrow.platformFee = fee;
      }

      escrow.status = 'RELEASED';
      db.escrows.update(escrow);

      logAudit({
        userId: null,
        action: 'AUTO_ACCEPT',
        resource: 'escrow',
        resourceId: escrow.id,
        details: { reason: 'Inspection deadline expired' },
      });

      logger.info('scheduler', `Auto-accepted escrow ${escrow.id} (inspection expired)`);

      // Notify parties
      const buyer = db.users.getById(escrow.buyerId);
      if (buyer) {
        db.emailQueue.enqueue({
          to_email: buyer.email,
          subject: `Escrow ${escrow.id} auto-accepted`,
          template: 'escrowAccepted',
          templateData: { username: buyer.username, escrowId: escrow.id, title: escrow.title },
        });
      }
      if (seller) {
        db.emailQueue.enqueue({
          to_email: seller.email,
          subject: `Escrow ${escrow.id} — funds released`,
          template: 'escrowAccepted',
          templateData: { username: seller.username, escrowId: escrow.id, title: escrow.title },
        });
      }
    }
  } catch (err) {
    logger.error('scheduler', `autoAcceptExpiredInspections failed: ${err.message}`);
  }
}

/**
 * Expire old funded escrows (refund buyer)
 */
function expireOldEscrows() {
  try {
    const now = new Date().toISOString();
    const expired = db.escrows.getExpiredFunded(now);

    for (const escrow of expired) {
      // Refund buyer
      const buyer = db.users.getById(escrow.buyerId);
      if (buyer) {
        db.users.updateBalance(buyer.id, buyer.walletBalance + escrow.amount);
      }

      escrow.status = 'EXPIRED';
      escrow.history.push({
        action: 'EXPIRED',
        by: 'system',
        at: now,
        details: 'Escrow expired — funds refunded to buyer',
      });
      db.escrows.update(escrow);

      logAudit({
        userId: null,
        action: 'EXPIRE',
        resource: 'escrow',
        resourceId: escrow.id,
        details: { reason: 'Escrow expiry reached' },
      });

      logger.info('scheduler', `Expired escrow ${escrow.id} — refunded buyer`);
    }
  } catch (err) {
    logger.error('scheduler', `expireOldEscrows failed: ${err.message}`);
  }
}

/**
 * Clean old blacklisted JWT tokens (older than 8 days)
 */
function cleanOldTokens() {
  try {
    const cutoff = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
    const result = db.tokens.cleanOld(cutoff);
    if (result.changes > 0) {
      logger.info('scheduler', `Cleaned ${result.changes} old blacklisted token(s)`);
    }
  } catch (err) {
    logger.error('scheduler', `cleanOldTokens failed: ${err.message}`);
  }
}

/**
 * Start all scheduled tasks
 */
function startScheduler() {
  logger.info('scheduler', 'Starting scheduler...');

  // Every 30s: poll deposit monitor
  intervals.push(setInterval(async () => {
    try { await pollDeposits(); } catch (e) {
      logger.error('scheduler', `Deposit poll error: ${e.message}`);
    }
  }, 30000));

  // Every 10s: process email queue
  intervals.push(setInterval(async () => {
    try { await processEmailQueue(); } catch (e) {
      logger.error('scheduler', `Email queue error: ${e.message}`);
    }
  }, 10000));

  // Every 5min: expire old escrows + auto-accept
  intervals.push(setInterval(() => {
    expireOldEscrows();
    autoAcceptExpiredInspections();
  }, 5 * 60 * 1000));

  // Every 1hr: clean old tokens
  intervals.push(setInterval(() => {
    cleanOldTokens();
  }, 60 * 60 * 1000));

  // Run once on startup (after a short delay)
  setTimeout(() => {
    expireOldEscrows();
    autoAcceptExpiredInspections();
    cleanOldTokens();
  }, 5000);

  logger.info('scheduler', 'Scheduler started (deposit:30s, email:10s, expire:5m, cleanup:1h)');
}

/**
 * Stop all scheduled tasks
 */
function stopScheduler() {
  intervals.forEach(clearInterval);
  intervals = [];
  logger.info('scheduler', 'Scheduler stopped');
}

module.exports = { startScheduler, stopScheduler };
