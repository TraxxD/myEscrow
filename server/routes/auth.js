const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'All fields required', status: 422 },
    });
  }

  // Check for existing email
  const existing = [...db.users.values()].find(u => u.email === email);
  if (existing) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Email already registered', status: 400 },
    });
  }

  const id = `usr_${uuidv4().slice(0, 8)}`;
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = {
    id,
    username,
    email,
    password: hashedPassword,
    walletBalance: 1.0, // Start with demo BTC
    createdAt: new Date().toISOString(),
  };

  db.users.set(id, user);

  const token = jwt.sign({ id, username, email }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safeUser } = user;
  res.status(201).json({ token, user: safeUser });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = [...db.users.values()].find(u => u.email === email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Invalid credentials', status: 401 },
    });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  const { password: _, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

module.exports = router;
