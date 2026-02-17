const bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');
const { BIP32Factory } = require('bip32');
const bip39 = require('bip39');
const { ECPairFactory } = require('ecpair');
const logger = require('../utils/logger');

const bip32 = BIP32Factory(ecc);
const ECPair = ECPairFactory(ecc);

// Testnet by default
const network = process.env.BTC_NETWORK === 'mainnet'
  ? bitcoin.networks.bitcoin
  : bitcoin.networks.testnet;

let masterNode = null;

/**
 * Initialize master HD keys from BIP39 mnemonic
 */
function initMasterKeys() {
  const mnemonic = process.env.BTC_MASTER_MNEMONIC;
  if (!mnemonic) {
    logger.warn('bitcoin', 'BTC_MASTER_MNEMONIC not set — Bitcoin features will use simulated addresses');
    return false;
  }

  if (!bip39.validateMnemonic(mnemonic)) {
    logger.error('bitcoin', 'Invalid BTC_MASTER_MNEMONIC');
    return false;
  }

  const seed = bip39.mnemonicToSeedSync(mnemonic);
  masterNode = bip32.fromSeed(seed, network);
  logger.info('bitcoin', 'Master HD keys initialized from mnemonic');
  return true;
}

/**
 * Derive a key pair for an escrow participant
 * Platform: m/44'/1'/0'/0/{index}
 * Buyer:    m/44'/1'/1'/0/{index}
 * Seller:   m/44'/1'/2'/0/{index}
 */
function deriveEscrowKeyPair(index, role) {
  if (!masterNode) return null;

  const coinType = network === bitcoin.networks.bitcoin ? 0 : 1;
  const accountMap = { platform: 0, buyer: 1, seller: 2 };
  const account = accountMap[role];
  if (account === undefined) throw new Error(`Invalid role: ${role}`);

  const path = `m/44'/${coinType}'/${account}'/0/${index}`;
  const child = masterNode.derivePath(path);

  return {
    publicKey: child.publicKey,
    privateKey: child.privateKey,
    publicKeyHex: child.publicKey.toString('hex'),
    path,
  };
}

/**
 * Create a 2-of-3 P2SH multisig address (BIP67 sorted pubkeys)
 */
function createMultisigAddress(pubkeys) {
  // BIP67: sort public keys lexicographically
  const sortedPubkeys = pubkeys
    .map(pk => typeof pk === 'string' ? Buffer.from(pk, 'hex') : pk)
    .sort((a, b) => a.compare(b));

  const p2ms = bitcoin.payments.p2ms({
    m: 2,
    pubkeys: sortedPubkeys,
    network,
  });

  const p2sh = bitcoin.payments.p2sh({
    redeem: p2ms,
    network,
  });

  return {
    address: p2sh.address,
    redeemScript: p2sh.redeem.output.toString('hex'),
    pubkeys: sortedPubkeys.map(pk => pk.toString('hex')),
  };
}

/**
 * Generate a full escrow address with keys for all 3 parties
 */
function generateEscrowAddress(derivationIndex) {
  if (!masterNode) {
    // Fallback: generate simulated address
    const { v4: uuidv4 } = require('uuid');
    return {
      address: `2${uuidv4().replace(/-/g, '').slice(0, 33)}`,
      buyerPubKey: null,
      sellerPubKey: null,
      platformPubKey: null,
      redeemScript: null,
      derivationIndex,
    };
  }

  const platformKey = deriveEscrowKeyPair(derivationIndex, 'platform');
  const buyerKey = deriveEscrowKeyPair(derivationIndex, 'buyer');
  const sellerKey = deriveEscrowKeyPair(derivationIndex, 'seller');

  const multisig = createMultisigAddress([
    platformKey.publicKey,
    buyerKey.publicKey,
    sellerKey.publicKey,
  ]);

  return {
    address: multisig.address,
    buyerPubKey: buyerKey.publicKeyHex,
    sellerPubKey: sellerKey.publicKeyHex,
    platformPubKey: platformKey.publicKeyHex,
    redeemScript: multisig.redeemScript,
    derivationIndex,
  };
}

/**
 * Build a release/refund transaction (PSBT)
 * Signs with platform key + appropriate party key
 */
async function buildReleaseTx(escrow, recipientAddress) {
  if (!masterNode) {
    logger.warn('bitcoin', 'Cannot build real tx — no master keys');
    return null;
  }

  try {
    // Fetch UTXOs from mempool.space
    const utxos = await fetchUTXOs(escrow.escrowAddress);
    if (!utxos || utxos.length === 0) {
      logger.warn('bitcoin', `No UTXOs found for ${escrow.escrowAddress}`);
      return null;
    }

    const platformKey = deriveEscrowKeyPair(escrow.derivationIndex, 'platform');
    const redeemScript = Buffer.from(escrow.redeemScript, 'hex');

    const psbt = new bitcoin.Psbt({ network });

    let totalInput = 0;
    for (const utxo of utxos) {
      const txHex = await fetchTxHex(utxo.txid);
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        nonWitnessUtxo: Buffer.from(txHex, 'hex'),
        redeemScript,
      });
      totalInput += utxo.value;
    }

    // Estimate fee (conservative: 250 bytes * 10 sat/byte)
    const fee = 2500;
    const outputAmount = totalInput - fee;

    if (outputAmount <= 0) {
      logger.error('bitcoin', 'Output amount is zero or negative after fees');
      return null;
    }

    psbt.addOutput({
      address: recipientAddress,
      value: outputAmount,
    });

    // Sign with platform key
    const platformSigner = ECPair.fromPrivateKey(platformKey.privateKey, { network });
    psbt.signAllInputs(platformSigner);

    return {
      psbt: psbt.toBase64(),
      totalInput,
      fee,
      outputAmount,
    };
  } catch (err) {
    logger.error('bitcoin', `Failed to build release tx: ${err.message}`);
    return null;
  }
}

/**
 * Broadcast a signed transaction
 */
async function broadcastTransaction(txHex) {
  const baseUrl = network === bitcoin.networks.bitcoin
    ? 'https://mempool.space/api'
    : 'https://mempool.space/testnet/api';

  const response = await fetch(`${baseUrl}/tx`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: txHex,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Broadcast failed: ${text}`);
  }

  const txid = await response.text();
  logger.info('bitcoin', `Transaction broadcast: ${txid}`);
  return txid;
}

/**
 * Fetch UTXOs for an address from mempool.space
 */
async function fetchUTXOs(address) {
  const baseUrl = network === bitcoin.networks.bitcoin
    ? 'https://mempool.space/api'
    : 'https://mempool.space/testnet/api';

  const response = await fetch(`${baseUrl}/address/${address}/utxo`);
  if (!response.ok) return [];
  return response.json();
}

/**
 * Fetch raw transaction hex
 */
async function fetchTxHex(txid) {
  const baseUrl = network === bitcoin.networks.bitcoin
    ? 'https://mempool.space/api'
    : 'https://mempool.space/testnet/api';

  const response = await fetch(`${baseUrl}/tx/${txid}/hex`);
  if (!response.ok) throw new Error(`Failed to fetch tx ${txid}`);
  return response.text();
}

/**
 * Convert BTC to satoshis
 */
function btcToSatoshis(btc) {
  return Math.round(btc * 100_000_000);
}

/**
 * Convert satoshis to BTC
 */
function satoshisToBtc(sats) {
  return sats / 100_000_000;
}

/**
 * Check address balance from mempool.space
 */
async function getAddressBalance(address) {
  const baseUrl = network === bitcoin.networks.bitcoin
    ? 'https://mempool.space/api'
    : 'https://mempool.space/testnet/api';

  try {
    const response = await fetch(`${baseUrl}/address/${address}`);
    if (!response.ok) return null;
    const data = await response.json();
    return {
      confirmed: data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum,
      unconfirmed: data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum,
    };
  } catch {
    return null;
  }
}

/**
 * Generate a new BIP39 mnemonic (utility for setup)
 */
function generateMnemonic() {
  return bip39.generateMnemonic(256); // 24 words
}

module.exports = {
  initMasterKeys,
  deriveEscrowKeyPair,
  createMultisigAddress,
  generateEscrowAddress,
  buildReleaseTx,
  broadcastTransaction,
  btcToSatoshis,
  satoshisToBtc,
  getAddressBalance,
  generateMnemonic,
  get network() { return network; },
  get isInitialized() { return !!masterNode; },
};
