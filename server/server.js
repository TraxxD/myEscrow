require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const escrowRoutes = require('./routes/escrow');
const walletRoutes = require('./routes/wallet');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// Security headers
app.use(helmet());

// Request logging
app.use(morgan('dev'));

// CORS — locked down for dev
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:5174'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parsing with size limit
app.use(express.json({ limit: '10kb' }));

// Global rate limiter on all /api routes
app.use('/api', apiLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/escrows', escrowRoutes);
app.use('/api/wallet', walletRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 catch-all
app.use((req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found`, status: 404 },
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Seed demo accounts on startup
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./config/db');

async function seedDemoAccounts() {
  const demos = [
    { username: 'alice', email: 'alice@demo.com', password: 'DemoPass1' },
    { username: 'bob', email: 'bob@demo.com', password: 'DemoPass1' },
    { username: 'charlie', email: 'charlie@demo.com', password: 'DemoPass1' },
  ];

  for (const demo of demos) {
    const exists = db.users.getByEmail(demo.email);
    if (exists) continue;

    const id = `usr_${uuidv4().slice(0, 8)}`;
    const hashedPassword = await bcrypt.hash(demo.password, 10);
    db.users.create({
      id,
      username: demo.username,
      email: demo.email,
      password: hashedPassword,
      walletBalance: 1.0,
      createdAt: new Date().toISOString(),
    });
  }
  logger.info('server', 'Demo accounts seeded (alice, bob, charlie)');
}

// Start server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, async () => {
  await seedDemoAccounts();
  logger.info('server', `Escrow API running on http://localhost:${PORT}`);
});

// Graceful shutdown
function shutdown(signal) {
  logger.info('server', `${signal} received — shutting down gracefully`);
  server.close(() => {
    logger.info('server', 'Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
