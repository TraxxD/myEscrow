# Server Reference Implementation

This document contains the reference code for the Express.js backend. In production, you would split these into separate files.

## server.js — Main Entry Point

```javascript
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// ─── In-Memory Database (use PostgreSQL in production) ───

const db = {
  users: new Map(),
  escrows: new Map(),
  transactions: new Map(),
};

// ─── Auth Middleware ───

function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Token required' } });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
  }
}

// ─── Auth Routes ───

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'All fields required' } });
  }

  const id = `usr_${uuidv4().slice(0, 8)}`;
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = {
    id, username, email,
    password: hashedPassword,
    walletBalance: 1.0, // Start with demo BTC
    createdAt: new Date().toISOString(),
  };

  db.users.set(id, user);

  const token = jwt.sign({ id, username, email }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safeUser } = user;
  res.status(201).json({ token, user: safeUser });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const user = [...db.users.values()].find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid credentials' } });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// ─── Escrow Routes ───

app.post('/api/escrows', authenticate, (req, res) => {
  const { title, description, amount, sellerUsername, expiresInDays = 14 } = req.body;

  const seller = [...db.users.values()].find(u => u.username === sellerUsername);
  if (!seller) {
    return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Seller not found' } });
  }

  const escrow = {
    id: `esc_${uuidv4().slice(0, 8)}`,
    title,
    description,
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

app.get('/api/escrows', authenticate, (req, res) => {
  const escrows = [...db.escrows.values()].filter(
    e => e.buyerId === req.user.id || e.sellerId === req.user.id
  );
  res.json(escrows);
});

app.get('/api/escrows/:id', authenticate, (req, res) => {
  const escrow = db.escrows.get(req.params.id);
  if (!escrow) return res.status(404).json({ error: { code: 'ESCROW_NOT_FOUND' } });
  res.json(escrow);
});

app.post('/api/escrows/:id/fund', authenticate, (req, res) => {
  const escrow = db.escrows.get(req.params.id);
  if (!escrow) return res.status(404).json({ error: { code: 'ESCROW_NOT_FOUND' } });
  if (escrow.status !== 'CREATED') {
    return res.status(400).json({ error: { code: 'INVALID_STATE', message: `Cannot fund escrow in ${escrow.status} state` } });
  }

  const buyer = db.users.get(req.user.id);
  if (buyer.walletBalance < escrow.amount) {
    return res.status(400).json({ error: { code: 'INSUFFICIENT_FUNDS' } });
  }

  buyer.walletBalance -= escrow.amount;
  escrow.status = 'FUNDED';
  escrow.fundedAt = new Date().toISOString();
  escrow.txHash = `tx_${uuidv4().replace(/-/g, '')}`;
  escrow.history.push({ action: 'FUNDED', by: req.user.username, at: escrow.fundedAt });

  res.json(escrow);
});

app.post('/api/escrows/:id/deliver', authenticate, (req, res) => {
  const escrow = db.escrows.get(req.params.id);
  if (!escrow || escrow.status !== 'FUNDED') {
    return res.status(400).json({ error: { code: 'INVALID_STATE' } });
  }

  escrow.status = 'DELIVERED';
  escrow.deliveredAt = new Date().toISOString();
  escrow.trackingInfo = req.body.trackingInfo;
  escrow.history.push({ action: 'DELIVERED', by: req.user.username, at: escrow.deliveredAt });

  res.json(escrow);
});

app.post('/api/escrows/:id/release', authenticate, (req, res) => {
  const escrow = db.escrows.get(req.params.id);
  if (!escrow || escrow.status !== 'DELIVERED') {
    return res.status(400).json({ error: { code: 'INVALID_STATE' } });
  }

  const seller = [...db.users.values()].find(u => u.username === escrow.seller);
  seller.walletBalance += escrow.amount * 0.98; // 2% fee

  escrow.status = 'RELEASED';
  escrow.releasedAt = new Date().toISOString();
  escrow.history.push({ action: 'RELEASED', by: req.user.username, at: escrow.releasedAt });

  res.json(escrow);
});

app.post('/api/escrows/:id/dispute', authenticate, (req, res) => {
  const escrow = db.escrows.get(req.params.id);
  if (!escrow || !['FUNDED', 'DELIVERED'].includes(escrow.status)) {
    return res.status(400).json({ error: { code: 'INVALID_STATE' } });
  }

  escrow.status = 'DISPUTED';
  escrow.dispute = {
    reason: req.body.reason,
    evidence: req.body.evidence,
    openedBy: req.user.username,
    openedAt: new Date().toISOString(),
  };
  escrow.history.push({ action: 'DISPUTED', by: req.user.username, at: escrow.dispute.openedAt });

  res.json(escrow);
});

app.post('/api/escrows/:id/resolve', authenticate, (req, res) => {
  const escrow = db.escrows.get(req.params.id);
  if (!escrow || escrow.status !== 'DISPUTED') {
    return res.status(400).json({ error: { code: 'INVALID_STATE' } });
  }

  const { ruling, splitPercentage = 100, notes } = req.body;
  const recipient = ruling === 'BUYER'
    ? db.users.get(escrow.buyerId)
    : [...db.users.values()].find(u => u.username === escrow.seller);

  recipient.walletBalance += escrow.amount * (splitPercentage / 100) * 0.97; // 3% dispute fee

  escrow.status = 'RESOLVED';
  escrow.resolution = { ruling, splitPercentage, notes, resolvedAt: new Date().toISOString() };
  escrow.history.push({ action: 'RESOLVED', by: 'arbiter', at: escrow.resolution.resolvedAt });

  res.json(escrow);
});

// ─── Wallet Routes ───

app.get('/api/wallet/balance', authenticate, (req, res) => {
  const user = db.users.get(req.user.id);
  res.json({ balance: user.walletBalance });
});

// ─── Start ───

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Escrow API running on port ${PORT}`));
```

## Bitcoin Service (Production)

In production, replace the simulated wallet with real Bitcoin multisig:

```javascript
const bitcoin = require('bitcoinjs-lib');
const ecc = require('tiny-secp256k1');
const { ECPairFactory } = require('ecpair');

const ECPair = ECPairFactory(ecc);
const network = bitcoin.networks.testnet; // Use mainnet for production

function createMultisigAddress(pubkeys) {
  const p2ms = bitcoin.payments.p2ms({
    m: 2, // 2-of-3
    pubkeys: pubkeys.map(hex => Buffer.from(hex, 'hex')),
    network,
  });

  const p2sh = bitcoin.payments.p2sh({
    redeem: p2ms,
    network,
  });

  return {
    address: p2sh.address,
    redeemScript: p2ms.output.toString('hex'),
  };
}

function createSignedTransaction(escrow, signerKeyPair, toAddress) {
  // Build and sign a transaction releasing escrow funds
  // In production, this would query UTXOs, calculate fees, etc.
  const psbt = new bitcoin.Psbt({ network });

  // Add input (escrow UTXO)
  psbt.addInput({
    hash: escrow.txHash,
    index: 0,
    redeemScript: Buffer.from(escrow.redeemScript, 'hex'),
  });

  // Add output (to recipient)
  psbt.addOutput({
    address: toAddress,
    value: escrow.amountSatoshis - 10000, // minus fee
  });

  // Sign (needs 2 of 3 signatures)
  psbt.signInput(0, signerKeyPair);

  return psbt.toBase64(); // Partially signed, needs 2nd signature
}

module.exports = { createMultisigAddress, createSignedTransaction };
```
