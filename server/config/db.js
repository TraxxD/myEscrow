// In-memory database — replace with PostgreSQL in production
const db = {
  users: new Map(),
  escrows: new Map(),
  transactions: new Map(),
  tokenBlacklist: new Set(),
};

module.exports = db;
