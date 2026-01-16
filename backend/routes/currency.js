const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const {
  getSupportedCurrencies,
  getExchangeRates,
  convertCurrency,
  isCurrencySupported
} = require('../services/currencyService');

// Get all supported currencies
router.get('/supported', authenticateToken, (req, res) => {
  try {
    const currencies = getSupportedCurrencies();
    res.json({ success: true, currencies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get exchange rates
router.get('/rates', authenticateToken, async (req, res) => {
  try {
    const baseCurrency = req.query.base || 'usd';
    const rates = await getExchangeRates(baseCurrency);
    res.json({ success: true, ...rates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all user balances (multi-currency)
router.get('/balances', authenticateToken, (req, res) => {
  db.all(
    'SELECT currency, amount FROM balances WHERE user_id = ? AND amount > 0 ORDER BY amount DESC',
    [req.user.userId],
    (err, balances) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Also get the legacy balance from users table for backward compatibility
      db.get('SELECT balance FROM users WHERE id = ?', [req.user.userId], (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        const allBalances = balances || [];

        // If user has legacy balance, include it as USD
        if (user && user.balance > 0) {
          const existingUsd = allBalances.find(b => b.currency === 'usd');
          if (!existingUsd) {
            allBalances.unshift({ currency: 'usd', amount: user.balance });
          }
        }

        res.json({ success: true, balances: allBalances });
      });
    }
  );
});

// Exchange currency (forex trading)
router.post('/exchange', authenticateToken, async (req, res) => {
  const { fromCurrency, toCurrency, amount } = req.body;

  if (!fromCurrency || !toCurrency || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }

  if (!isCurrencySupported(fromCurrency) || !isCurrencySupported(toCurrency)) {
    return res.status(400).json({ error: 'Currency not supported' });
  }

  try {
    // Get conversion rate
    const conversion = await convertCurrency(amount, fromCurrency, toCurrency);

    // Check if user has enough balance in source currency
    db.get(
      'SELECT amount FROM balances WHERE user_id = ? AND currency = ?',
      [req.user.userId, fromCurrency.toLowerCase()],
      (err, balance) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Also check legacy balance for USD
        db.get('SELECT balance FROM users WHERE id = ?', [req.user.userId], (err, user) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          let currentBalance = balance ? balance.amount : 0;

          // For USD, also consider legacy balance
          if (fromCurrency.toLowerCase() === 'usd' && user && user.balance > 0) {
            currentBalance += user.balance;
          }

          if (currentBalance < amount) {
            return res.status(400).json({ error: 'Insufficient balance' });
          }

          // Perform the exchange
          db.serialize(() => {
            // Deduct from source currency
            db.run(
              `INSERT INTO balances (user_id, currency, amount) VALUES (?, ?, ?)
               ON CONFLICT(user_id, currency) DO UPDATE SET amount = amount - ?`,
              [req.user.userId, fromCurrency.toLowerCase(), -amount, amount]
            );

            // Add to destination currency
            db.run(
              `INSERT INTO balances (user_id, currency, amount) VALUES (?, ?, ?)
               ON CONFLICT(user_id, currency) DO UPDATE SET amount = amount + ?`,
              [req.user.userId, toCurrency.toLowerCase(), conversion.amount, conversion.amount]
            );

            // Log transaction
            db.run(
              `INSERT INTO transactions (user_id, symbol, coin_id, name, type, amount, price, total, currency, from_currency, to_currency, exchange_rate)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                req.user.userId,
                'FOREX',
                'forex',
                'Currency Exchange',
                'exchange',
                amount,
                conversion.rate,
                conversion.amount,
                fromCurrency.toLowerCase(),
                fromCurrency.toLowerCase(),
                toCurrency.toLowerCase(),
                conversion.rate
              ],
              function (err) {
                if (err) {
                  return res.status(500).json({ error: 'Transaction logging failed' });
                }

                res.json({
                  success: true,
                  message: `Exchanged ${amount} ${fromCurrency.toUpperCase()} to ${conversion.amount.toFixed(2)} ${toCurrency.toUpperCase()}`,
                  exchange: {
                    from: {
                      currency: fromCurrency.toUpperCase(),
                      amount: amount
                    },
                    to: {
                      currency: toCurrency.toUpperCase(),
                      amount: conversion.amount
                    },
                    rate: conversion.rate
                  }
                });
              }
            );
          });
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add funds to a specific currency
router.post('/deposit', authenticateToken, (req, res) => {
  const { currency, amount } = req.body;

  if (!currency || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  if (!isCurrencySupported(currency)) {
    return res.status(400).json({ error: 'Currency not supported' });
  }

  db.serialize(() => {
    // Add to balance
    db.run(
      `INSERT INTO balances (user_id, currency, amount) VALUES (?, ?, ?)
       ON CONFLICT(user_id, currency) DO UPDATE SET amount = amount + ?`,
      [req.user.userId, currency.toLowerCase(), amount, amount]
    );

    // Log transaction
    db.run(
      `INSERT INTO transactions (user_id, symbol, coin_id, name, type, amount, price, total, currency)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.userId, currency.toUpperCase(), currency.toLowerCase(), `${currency.toUpperCase()} Deposit`, 'deposit', amount, 1, amount, currency.toLowerCase()],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Transaction logging failed' });
        }

        res.json({
          success: true,
          message: `Deposited ${amount} ${currency.toUpperCase()}`,
          currency: currency.toUpperCase(),
          amount: amount
        });
      }
    );
  });
});

// Set preferred display currency
router.post('/preference', authenticateToken, (req, res) => {
  const { currency } = req.body;

  if (!currency || !isCurrencySupported(currency)) {
    return res.status(400).json({ error: 'Invalid currency' });
  }

  db.run(
    'UPDATE users SET preferred_currency = ? WHERE id = ?',
    [currency.toLowerCase(), req.user.userId],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        success: true,
        message: `Preferred currency set to ${currency.toUpperCase()}`,
        currency: currency.toLowerCase()
      });
    }
  );
});

// Get user's preferred currency
router.get('/preference', authenticateToken, (req, res) => {
  db.get(
    'SELECT preferred_currency FROM users WHERE id = ?',
    [req.user.userId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      res.json({
        success: true,
        preferred_currency: row?.preferred_currency || 'usd'
      });
    }
  );
});

module.exports = router;
