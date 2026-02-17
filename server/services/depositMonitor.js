const db = require('../config/db');
const logger = require('../utils/logger');

const POLL_INTERVAL = parseInt(process.env.DEPOSIT_POLL_INTERVAL) || 30000;
const MIN_CONFIRMATIONS = parseInt(process.env.DEPOSIT_MIN_CONFIRMATIONS) || 1;

const baseUrl = process.env.BTC_NETWORK === 'mainnet'
  ? 'https://mempool.space/api'
  : 'https://mempool.space/testnet/api';

/**
 * Check a single watched address for deposits
 */
async function checkAddress(watch) {
  try {
    // Get address info
    const addrResp = await fetch(`${baseUrl}/address/${watch.address}`);
    if (!addrResp.ok) return;
    const addrData = await addrResp.json();

    const confirmedBalance = addrData.chain_stats.funded_txo_sum - addrData.chain_stats.spent_txo_sum;
    const unconfirmedBalance = addrData.mempool_stats.funded_txo_sum - addrData.mempool_stats.spent_txo_sum;
    const totalBalance = confirmedBalance + unconfirmedBalance;

    if (totalBalance < watch.expectedSatoshis) {
      // Not enough funds yet
      db.deposits.update({
        id: watch.id,
        status: 'watching',
        detectedTxHash: watch.detectedTxHash,
        confirmations: 0,
      });
      return;
    }

    // Funds detected — get the transaction
    const txsResp = await fetch(`${baseUrl}/address/${watch.address}/txs`);
    if (!txsResp.ok) return;
    const txs = await txsResp.json();

    if (txs.length === 0) return;

    // Find the funding tx
    const fundingTx = txs[0];
    const txid = fundingTx.txid;
    const confirmations = fundingTx.status.confirmed
      ? fundingTx.status.block_height
        ? await getConfirmations(fundingTx.status.block_height)
        : 1
      : 0;

    if (confirmations >= MIN_CONFIRMATIONS) {
      // Deposit confirmed — update escrow to FUNDED
      const escrow = db.escrows.getById(watch.escrowId);
      if (escrow && escrow.status === 'AWAITING_DEPOSIT') {
        escrow.status = 'FUNDED';
        escrow.txHash = txid;
        escrow.fundedAt = new Date().toISOString();
        escrow.confirmations = confirmations;
        escrow.history.push({
          action: 'FUNDED',
          by: 'deposit_monitor',
          at: escrow.fundedAt,
          details: `Confirmed on-chain (${confirmations} confirmations)`,
        });
        db.escrows.update(escrow);

        logger.info('depositMonitor', `Escrow ${watch.escrowId} funded on-chain: ${txid} (${confirmations} conf)`);

        // Queue notification email
        const buyer = db.users.getById(escrow.buyerId);
        const seller = db.users.getById(escrow.sellerId);
        if (buyer) {
          db.emailQueue.enqueue({
            to_email: buyer.email,
            subject: `Escrow ${escrow.id} has been funded`,
            template: 'escrowFunded',
            templateData: { username: buyer.username, escrowId: escrow.id, amount: escrow.amount, title: escrow.title },
          });
        }
        if (seller) {
          db.emailQueue.enqueue({
            to_email: seller.email,
            subject: `Escrow ${escrow.id} has been funded`,
            template: 'escrowFunded',
            templateData: { username: seller.username, escrowId: escrow.id, amount: escrow.amount, title: escrow.title },
          });
        }
      }

      db.deposits.update({
        id: watch.id,
        status: 'confirmed',
        detectedTxHash: txid,
        confirmations,
      });
    } else {
      // Tx detected but not enough confirmations
      db.deposits.update({
        id: watch.id,
        status: 'watching',
        detectedTxHash: txid,
        confirmations,
      });
    }
  } catch (err) {
    logger.error('depositMonitor', `Error checking ${watch.address}: ${err.message}`);
  }
}

/**
 * Get current block height and calculate confirmations
 */
async function getConfirmations(blockHeight) {
  try {
    const resp = await fetch(`${baseUrl}/blocks/tip/height`);
    if (!resp.ok) return 0;
    const tipHeight = parseInt(await resp.text());
    return tipHeight - blockHeight + 1;
  } catch {
    return 0;
  }
}

/**
 * Poll all active deposit watches
 */
async function pollDeposits() {
  const watches = db.deposits.getActive();
  if (watches.length === 0) return;

  logger.info('depositMonitor', `Checking ${watches.length} active deposit watch(es)`);

  for (const watch of watches) {
    await checkAddress(watch);
  }
}

module.exports = {
  pollDeposits,
  checkAddress,
  POLL_INTERVAL,
  MIN_CONFIRMATIONS,
};
