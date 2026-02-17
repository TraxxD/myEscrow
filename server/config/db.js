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

// ─── Safe Migrations (add columns to existing tables) ───
const migrations = [
  // users table additions
  `ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'`,
  `ALTER TABLE users ADD COLUMN resetToken TEXT`,
  `ALTER TABLE users ADD COLUMN resetTokenExpiry TEXT`,

  // escrows table additions
  `ALTER TABLE escrows ADD COLUMN category TEXT`,
  `ALTER TABLE escrows ADD COLUMN inspectionDays INTEGER DEFAULT 3`,
  `ALTER TABLE escrows ADD COLUMN inspectionDeadline TEXT`,
  `ALTER TABLE escrows ADD COLUMN buyerAgreed INTEGER DEFAULT 0`,
  `ALTER TABLE escrows ADD COLUMN sellerAgreed INTEGER DEFAULT 0`,
  `ALTER TABLE escrows ADD COLUMN rejectionReason TEXT`,
  `ALTER TABLE escrows ADD COLUMN returnTrackingInfo TEXT`,
  `ALTER TABLE escrows ADD COLUMN buyerPubKey TEXT`,
  `ALTER TABLE escrows ADD COLUMN sellerPubKey TEXT`,
  `ALTER TABLE escrows ADD COLUMN platformPubKey TEXT`,
  `ALTER TABLE escrows ADD COLUMN redeemScript TEXT`,
  `ALTER TABLE escrows ADD COLUMN derivationIndex INTEGER`,
  `ALTER TABLE escrows ADD COLUMN amountSatoshis INTEGER`,
  `ALTER TABLE escrows ADD COLUMN confirmations INTEGER DEFAULT 0`,
  `ALTER TABLE escrows ADD COLUMN releaseTxHash TEXT`,
  `ALTER TABLE escrows ADD COLUMN platformFee REAL DEFAULT 0`,
];

for (const sql of migrations) {
  try { db.exec(sql); } catch (e) {
    // Column already exists — safe to ignore
  }
}

// ─── New Tables ───
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    userId TEXT,
    action TEXT NOT NULL,
    resource TEXT,
    resourceId TEXT,
    details TEXT,
    ip TEXT
  );

  CREATE TABLE IF NOT EXISTS platform_fees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    escrowId TEXT NOT NULL REFERENCES escrows(id),
    feeType TEXT NOT NULL,
    amountBtc REAL NOT NULL,
    collectedAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS email_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    to_email TEXT NOT NULL,
    subject TEXT NOT NULL,
    template TEXT NOT NULL,
    templateData TEXT DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    createdAt TEXT NOT NULL,
    processedAt TEXT,
    error TEXT
  );

  CREATE TABLE IF NOT EXISTS deposit_monitor (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    escrowId TEXT NOT NULL REFERENCES escrows(id),
    address TEXT NOT NULL,
    expectedSatoshis INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'watching',
    detectedTxHash TEXT,
    confirmations INTEGER DEFAULT 0,
    lastCheckedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    escrowId TEXT NOT NULL REFERENCES escrows(id),
    senderId TEXT NOT NULL REFERENCES users(id),
    senderUsername TEXT NOT NULL,
    body TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_audit_log_userId ON audit_log(userId);
  CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource, resourceId);
  CREATE INDEX IF NOT EXISTS idx_messages_escrowId ON messages(escrowId);
  CREATE INDEX IF NOT EXISTS idx_deposit_monitor_status ON deposit_monitor(status);
  CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
  CREATE INDEX IF NOT EXISTS idx_escrows_status ON escrows(status);
`);

// ─── Prepared Statements ───
const stmts = {
  // Users
  createUser: db.prepare(`
    INSERT INTO users (id, username, email, password, walletBalance, role, createdAt)
    VALUES (@id, @username, @email, @password, @walletBalance, @role, @createdAt)
  `),
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  getUserByUsername: db.prepare('SELECT * FROM users WHERE username = ?'),
  updateBalance: db.prepare('UPDATE users SET walletBalance = @balance WHERE id = @id'),
  updateRole: db.prepare('UPDATE users SET role = @role WHERE id = @id'),
  updateResetToken: db.prepare('UPDATE users SET resetToken = @resetToken, resetTokenExpiry = @resetTokenExpiry WHERE id = @id'),
  getUserByResetToken: db.prepare('SELECT * FROM users WHERE resetToken = ?'),
  clearResetToken: db.prepare('UPDATE users SET resetToken = NULL, resetTokenExpiry = NULL WHERE id = ?'),
  getAllUsers: db.prepare('SELECT id, username, email, role, walletBalance, createdAt FROM users ORDER BY createdAt DESC'),

  // Escrows
  createEscrow: db.prepare(`
    INSERT INTO escrows (
      id, title, description, amount, status, buyer, buyerId, seller, sellerId, arbiter,
      escrowAddress, createdAt, expiresAt, history, category, inspectionDays,
      buyerPubKey, sellerPubKey, platformPubKey, redeemScript, derivationIndex,
      amountSatoshis, platformFee
    )
    VALUES (
      @id, @title, @description, @amount, @status, @buyer, @buyerId, @seller, @sellerId, @arbiter,
      @escrowAddress, @createdAt, @expiresAt, @history, @category, @inspectionDays,
      @buyerPubKey, @sellerPubKey, @platformPubKey, @redeemScript, @derivationIndex,
      @amountSatoshis, @platformFee
    )
  `),
  getEscrowById: db.prepare('SELECT * FROM escrows WHERE id = ?'),
  getEscrowsForUser: db.prepare('SELECT * FROM escrows WHERE buyerId = ? OR sellerId = ? ORDER BY createdAt DESC'),
  getAllEscrows: db.prepare('SELECT * FROM escrows ORDER BY createdAt DESC'),
  getEscrowsByStatus: db.prepare('SELECT * FROM escrows WHERE status = ? ORDER BY createdAt DESC'),
  getNextDerivationIndex: db.prepare('SELECT COALESCE(MAX(derivationIndex), -1) + 1 AS nextIndex FROM escrows'),
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
      history = @history,
      buyerAgreed = @buyerAgreed,
      sellerAgreed = @sellerAgreed,
      inspectionDeadline = @inspectionDeadline,
      rejectionReason = @rejectionReason,
      returnTrackingInfo = @returnTrackingInfo,
      confirmations = @confirmations,
      releaseTxHash = @releaseTxHash,
      platformFee = @platformFee
    WHERE id = @id
  `),
  getExpiredFundedEscrows: db.prepare(`
    SELECT * FROM escrows WHERE status = 'FUNDED' AND expiresAt < ?
  `),
  getExpiredInspectionEscrows: db.prepare(`
    SELECT * FROM escrows WHERE status = 'INSPECTION' AND inspectionDeadline IS NOT NULL AND inspectionDeadline < ?
  `),

  // Token blacklist
  blacklistToken: db.prepare('INSERT OR IGNORE INTO token_blacklist (jti, blacklistedAt) VALUES (?, ?)'),
  isBlacklisted: db.prepare('SELECT 1 FROM token_blacklist WHERE jti = ?'),
  cleanOldTokens: db.prepare('DELETE FROM token_blacklist WHERE blacklistedAt < ?'),

  // Audit log
  insertAuditLog: db.prepare(`
    INSERT INTO audit_log (timestamp, userId, action, resource, resourceId, details, ip)
    VALUES (@timestamp, @userId, @action, @resource, @resourceId, @details, @ip)
  `),
  getAuditLogs: db.prepare('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT ? OFFSET ?'),
  getAuditLogsByResource: db.prepare('SELECT * FROM audit_log WHERE resource = ? AND resourceId = ? ORDER BY timestamp DESC'),

  // Platform fees
  insertFee: db.prepare(`
    INSERT INTO platform_fees (escrowId, feeType, amountBtc, collectedAt)
    VALUES (@escrowId, @feeType, @amountBtc, @collectedAt)
  `),
  getAllFees: db.prepare('SELECT * FROM platform_fees ORDER BY collectedAt DESC'),
  getFeeStats: db.prepare('SELECT feeType, SUM(amountBtc) as total, COUNT(*) as count FROM platform_fees GROUP BY feeType'),

  // Email queue
  insertEmail: db.prepare(`
    INSERT INTO email_queue (to_email, subject, template, templateData, status, createdAt)
    VALUES (@to_email, @subject, @template, @templateData, @status, @createdAt)
  `),
  getPendingEmails: db.prepare("SELECT * FROM email_queue WHERE status = 'pending' ORDER BY createdAt ASC LIMIT 10"),
  updateEmailStatus: db.prepare('UPDATE email_queue SET status = @status, processedAt = @processedAt, error = @error WHERE id = @id'),

  // Deposit monitor
  insertDepositWatch: db.prepare(`
    INSERT INTO deposit_monitor (escrowId, address, expectedSatoshis, status, lastCheckedAt)
    VALUES (@escrowId, @address, @expectedSatoshis, @status, @lastCheckedAt)
  `),
  getActiveWatches: db.prepare("SELECT * FROM deposit_monitor WHERE status = 'watching'"),
  updateDepositWatch: db.prepare(`
    UPDATE deposit_monitor SET
      status = @status,
      detectedTxHash = @detectedTxHash,
      confirmations = @confirmations,
      lastCheckedAt = @lastCheckedAt
    WHERE id = @id
  `),

  // Messages
  insertMessage: db.prepare(`
    INSERT INTO messages (escrowId, senderId, senderUsername, body, createdAt)
    VALUES (@escrowId, @senderId, @senderUsername, @body, @createdAt)
  `),
  getMessagesByEscrow: db.prepare('SELECT * FROM messages WHERE escrowId = ? ORDER BY createdAt ASC'),
};

// ─── Stats queries ───
const statQueries = {
  totalUsers: db.prepare('SELECT COUNT(*) as count FROM users'),
  totalEscrows: db.prepare('SELECT COUNT(*) as count FROM escrows'),
  activeEscrows: db.prepare("SELECT COUNT(*) as count FROM escrows WHERE status NOT IN ('RELEASED', 'RESOLVED', 'REFUNDED', 'EXPIRED')"),
  totalVolume: db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM escrows'),
  totalFees: db.prepare('SELECT COALESCE(SUM(amountBtc), 0) as total FROM platform_fees'),
  disputeCount: db.prepare("SELECT COUNT(*) as count FROM escrows WHERE status = 'DISPUTED'"),
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

// Serialize escrow for UPDATE
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
    buyerAgreed: escrow.buyerAgreed || 0,
    sellerAgreed: escrow.sellerAgreed || 0,
    inspectionDeadline: escrow.inspectionDeadline || null,
    rejectionReason: escrow.rejectionReason || null,
    returnTrackingInfo: escrow.returnTrackingInfo || null,
    confirmations: escrow.confirmations || 0,
    releaseTxHash: escrow.releaseTxHash || null,
    platformFee: escrow.platformFee || 0,
  };
}

// ─── Public API ───
module.exports = {
  raw: db,

  users: {
    create(user) {
      stmts.createUser.run({ ...user, role: user.role || 'user' });
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
    updateRole(id, role) {
      stmts.updateRole.run({ id, role });
    },
    setResetToken(id, token, expiry) {
      stmts.updateResetToken.run({ id, resetToken: token, resetTokenExpiry: expiry });
    },
    getByResetToken(token) {
      return stmts.getUserByResetToken.get(token);
    },
    clearResetToken(id) {
      stmts.clearResetToken.run(id);
    },
    getAll() {
      return stmts.getAllUsers.all();
    },
  },

  escrows: {
    create(escrow) {
      stmts.createEscrow.run({
        ...escrow,
        history: JSON.stringify(escrow.history),
        category: escrow.category || null,
        inspectionDays: escrow.inspectionDays || 3,
        buyerPubKey: escrow.buyerPubKey || null,
        sellerPubKey: escrow.sellerPubKey || null,
        platformPubKey: escrow.platformPubKey || null,
        redeemScript: escrow.redeemScript || null,
        derivationIndex: escrow.derivationIndex ?? null,
        amountSatoshis: escrow.amountSatoshis || null,
        platformFee: escrow.platformFee || 0,
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
    getAll() {
      return stmts.getAllEscrows.all().map(parseEscrow);
    },
    getByStatus(status) {
      return stmts.getEscrowsByStatus.all(status).map(parseEscrow);
    },
    getNextDerivationIndex() {
      return stmts.getNextDerivationIndex.get().nextIndex;
    },
    update(escrow) {
      stmts.updateEscrow.run(serializeEscrowForUpdate(escrow));
    },
    getExpiredFunded(now) {
      return stmts.getExpiredFundedEscrows.all(now).map(parseEscrow);
    },
    getExpiredInspection(now) {
      return stmts.getExpiredInspectionEscrows.all(now).map(parseEscrow);
    },
  },

  tokens: {
    blacklist(jti) {
      stmts.blacklistToken.run(jti, new Date().toISOString());
    },
    isBlacklisted(jti) {
      return !!stmts.isBlacklisted.get(jti);
    },
    cleanOld(before) {
      return stmts.cleanOldTokens.run(before);
    },
  },

  audit: {
    log(entry) {
      stmts.insertAuditLog.run({
        timestamp: new Date().toISOString(),
        userId: entry.userId || null,
        action: entry.action,
        resource: entry.resource || null,
        resourceId: entry.resourceId || null,
        details: entry.details ? JSON.stringify(entry.details) : null,
        ip: entry.ip || null,
      });
    },
    getAll(limit = 50, offset = 0) {
      return stmts.getAuditLogs.all(limit, offset).map(row => ({
        ...row,
        details: row.details ? JSON.parse(row.details) : null,
      }));
    },
    getByResource(resource, resourceId) {
      return stmts.getAuditLogsByResource.all(resource, resourceId).map(row => ({
        ...row,
        details: row.details ? JSON.parse(row.details) : null,
      }));
    },
  },

  fees: {
    record(entry) {
      stmts.insertFee.run({
        escrowId: entry.escrowId,
        feeType: entry.feeType,
        amountBtc: entry.amountBtc,
        collectedAt: new Date().toISOString(),
      });
    },
    getAll() {
      return stmts.getAllFees.all();
    },
    getStats() {
      return stmts.getFeeStats.all();
    },
  },

  emailQueue: {
    enqueue(entry) {
      stmts.insertEmail.run({
        to_email: entry.to_email,
        subject: entry.subject,
        template: entry.template,
        templateData: JSON.stringify(entry.templateData || {}),
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    },
    getPending() {
      return stmts.getPendingEmails.all().map(row => ({
        ...row,
        templateData: JSON.parse(row.templateData || '{}'),
      }));
    },
    updateStatus(id, status, error = null) {
      stmts.updateEmailStatus.run({
        id,
        status,
        processedAt: new Date().toISOString(),
        error: error || null,
      });
    },
  },

  deposits: {
    watch(entry) {
      stmts.insertDepositWatch.run({
        escrowId: entry.escrowId,
        address: entry.address,
        expectedSatoshis: entry.expectedSatoshis,
        status: 'watching',
        lastCheckedAt: new Date().toISOString(),
      });
    },
    getActive() {
      return stmts.getActiveWatches.all();
    },
    update(entry) {
      stmts.updateDepositWatch.run({
        id: entry.id,
        status: entry.status,
        detectedTxHash: entry.detectedTxHash || null,
        confirmations: entry.confirmations || 0,
        lastCheckedAt: new Date().toISOString(),
      });
    },
  },

  messages: {
    create(msg) {
      stmts.insertMessage.run({
        escrowId: msg.escrowId,
        senderId: msg.senderId,
        senderUsername: msg.senderUsername,
        body: msg.body,
        createdAt: new Date().toISOString(),
      });
    },
    getByEscrow(escrowId) {
      return stmts.getMessagesByEscrow.all(escrowId);
    },
  },

  stats: {
    get() {
      return {
        totalUsers: statQueries.totalUsers.get().count,
        totalEscrows: statQueries.totalEscrows.get().count,
        activeEscrows: statQueries.activeEscrows.get().count,
        totalVolume: statQueries.totalVolume.get().total,
        totalFees: statQueries.totalFees.get().total,
        disputeCount: statQueries.disputeCount.get().count,
      };
    },
  },
};
