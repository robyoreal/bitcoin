const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { generateToken, hashPassword, comparePassword } = require('../services/auth');

// Register new user
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  try {
    const hashedPassword = await hashPassword(password);
    const initialBalance = parseFloat(process.env.INITIAL_BALANCE) || 10000;

    db.run(
      'INSERT INTO users (username, email, password, balance) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, initialBalance],
      function (err) {
        if (err) {
          if (err.message.includes('UNIQUE')) {
            return res.status(400).json({ error: 'Username or email already exists' });
          }
          return res.status(500).json({ error: 'Database error' });
        }

        const token = generateToken(this.lastID, username);

        // Log deposit transaction
        db.run(
          'INSERT INTO transactions (user_id, symbol, coin_id, name, type, amount, price, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [this.lastID, 'USD', 'usd', 'US Dollar', 'deposit', initialBalance, 1, initialBalance]
        );

        res.status(201).json({
          message: 'User registered successfully',
          token,
          user: {
            id: this.lastID,
            username,
            email,
            balance: initialBalance
          }
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await comparePassword(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id, user.username);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        balance: user.balance
      }
    });
  });
});

module.exports = router;
