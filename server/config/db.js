const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'escrow.db');
const db = new Database(dbPath);

// Performance and safety
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Create Tables ───
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    walletBalance REAL NOT NULL DEFAULT 1.0,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS escrows (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'CREATED',
    buyer TEXT NOT NULL,
    buyerId TEXT NOT NULL REFERENCES users(id),
    seller TEXT NOT NULL,
    sellerId TEXT NOT NULL REFERENCES users(id),
    arbiter TEXT DEFAULT 'system',
    escrowAddress TEXT,
    txHash TEXT,
    fundedAt TEXT,
    deliveredAt TEXT,
    releasedAt TEXT,
    trackingInfo TEXT,
    deliveryNotes TEXT,
    dispute TEXT,
    resolution TEXT,
    history TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL,
    expiresAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS token_blacklist (
    jti TEXT PRIMARY KEY,
    blacklistedAt TEXT NOT NULL
  );
`);

// ─── Prepared Statements ───

// Users
const stmts = {
  createUser: db.prepare(`
    INSERT INTO users (id, username, email, password, walletBalance, createdAt)
    VALUES (@id, @username, @email, @password, @walletBalance, @createdAt)
  `),
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  getUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  updateBalance: db.prepare('UPDATE users SET walletBalance = @balance WHERE id = @id'),

  // Escrows
  createEscrow: db.prepare(`
    INSERT INTO escrows (id, title, description, amount, status, buyer, buyerId, seller, sellerId, arbiter, escrowAddress, createdAt, expiresAt, history)
    VALUES (@id, @title, @description, @amount, @status, @buyer, @buyerId, @seller, @sellerId, @arbiter, @escrowAddress, @createdAt, @expiresAt, @history)
  `),
  getEscrowById: db.prepare('SELECT * FROM escrows WHERE id = ?'),
  getEscrowsForUser: db.prepare('SELECT * FROM escrows WHERE buyerId = ? OR sellerId = ? ORDER BY createdAt DESC'),
  updateEscrow: db.prepare(`
    UPDATE escrows SET
      status = @status,
      txHash = @txHash,
      fundedAt = @fundedAt,
      deliveredAt = @deliveredAt,
      releasedAt = @releasedAt,
      trackingInfo = @trackingInfo,
      deliveryNotes = @deliveryNotes,
      dispute = @dispute,
      resolution = @resolution,
      history = @history
    WHERE id = @id
  `),

  // Token blacklist
  blacklistToken: db.prepare('INSERT OR IGNORE INTO token_blacklist (jti, blacklistedAt) VALUES (?, ?)'),
  isBlacklisted: db.prepare('SELECT 1 FROM token_blacklist WHERE jti = ?'),
};

// ─── Parse JSON fields from escrow rows ───
function parseEscrow(row) {
  if (!row) return null;
  return {
    ...row,
    history: JSON.parse(row.history || '[]'),
    dispute: row.dispute ? JSON.parse(row.dispute) : undefined,
    resolution: row.resolution ? JSON.parse(row.resolution) : undefined,
  };
}

// Serialize escrow for UPDATE — ensures all fields have values (null if not set)
function serializeEscrowForUpdate(escrow) {
  return {
    id: escrow.id,
    status: escrow.status,
    txHash: escrow.txHash || null,
    fundedAt: escrow.fundedAt || null,
    deliveredAt: escrow.deliveredAt || null,
    releasedAt: escrow.releasedAt || null,
    trackingInfo: escrow.trackingInfo || null,
    deliveryNotes: escrow.deliveryNotes || null,
    dispute: escrow.dispute ? JSON.stringify(escrow.dispute) : null,
    resolution: escrow.resolution ? JSON.stringify(escrow.resolution) : null,
    history: JSON.stringify(escrow.history || []),
  };
}

// ─── Public API ───
module.exports = {
  raw: db,

  users: {
    create(user) {
      stmts.createUser.run(user);
    },
    getById(id) {
      return stmts.getUserById.get(id);
    },
    getByEmail(email) {
      return stmts.getUserByEmail.get(email);
    },
    getByUsername(username) {
      return stmts.getUserByUsername.get(username);
    },
    updateBalance(id, balance) {
      stmts.updateBalance.run({ id, balance });
    },
  },

  escrows: {
    create(escrow) {
      stmts.createEscrow.run({
        ...escrow,
        history: JSON.stringify(escrow.history),
      });
    },
    getById(id) {
      return parseEscrow(stmts.getEscrowById.get(id));
    },
    getForUser(userId, filters = {}) {
      let rows = stmts.getEscrowsForUser.all(userId, userId);
      if (filters.status) rows = rows.filter(r => r.status === filters.status);
      if (filters.role === 'buyer') rows = rows.filter(r => r.buyerId === userId);
      else if (filters.role === 'seller') rows = rows.filter(r => r.sellerId === userId);
      return rows.map(parseEscrow);
    },
    update(escrow) {
      stmts.updateEscrow.run(serializeEscrowForUpdate(escrow));
    },
  },

  tokens: {
    blacklist(jti) {
      stmts.blacklistToken.run(jti, new Date().toISOString());
    },
    isBlacklisted(jti) {
      return !!stmts.isBlacklisted.get(jti);
    },
  },
};
