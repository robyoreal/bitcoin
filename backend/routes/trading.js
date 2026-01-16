const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { getCryptoPrice } = require('../services/cryptoAPI');
const { authenticateToken } = require('../middleware/auth');
const { isCurrencySupported } = require('../services/currencyService');

// Helper function to get balance in a specific currency
function getBalanceInCurrency(userId, currency, callback) {
  db.get(
    'SELECT amount FROM balances WHERE user_id = ? AND currency = ?',
    [userId, currency.toLowerCase()],
    (err, balance) => {
      if (err) return callback(err, null);

      // Also check legacy USD balance
      if (currency.toLowerCase() === 'usd') {
        db.get('SELECT balance FROM users WHERE id = ?', [userId], (err, user) => {
          if (err) return callback(err, null);
          const total = (balance?.amount || 0) + (user?.balance || 0);
          callback(null, total);
        });
      } else {
        callback(null, balance?.amount || 0);
      }
    }
  );
}

// Get user's current balance (backward compatible - returns USD)
router.get('/balance', authenticateToken, (req, res) => {
  const currency = req.query.currency || 'usd';

  getBalanceInCurrency(req.user.userId, currency, (err, balance) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, balance, currency: currency.toLowerCase() });
  });
});

// Top up balance (add virtual money) - now supports any currency
router.post('/topup', authenticateToken, (req, res) => {
  const { amount, currency = 'usd' } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  if (!isCurrencySupported(currency)) {
    return res.status(400).json({ error: 'Currency not supported' });
  }

  db.serialize(() => {
    // Add to multi-currency balance
    db.run(
      `INSERT INTO balances (user_id, currency, amount) VALUES (?, ?, ?)
       ON CONFLICT(user_id, currency) DO UPDATE SET amount = amount + ?`,
      [req.user.userId, currency.toLowerCase(), amount, amount]
    );

    // Log deposit transaction
    db.run(
      'INSERT INTO transactions (user_id, symbol, coin_id, name, type, amount, price, total, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.userId, currency.toUpperCase(), currency.toLowerCase(), `${currency.toUpperCase()} Deposit`, 'deposit', amount, 1, amount, currency.toLowerCase()],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Transaction logging failed' });
        }

        getBalanceInCurrency(req.user.userId, currency, (err, newBalance) => {
          res.json({
            success: true,
            message: `Added ${amount} ${currency.toUpperCase()} to your balance`,
            new_balance: newBalance,
            currency: currency.toLowerCase()
          });
        });
      }
    );
  });
});

// Buy cryptocurrency - now supports any currency
router.post('/buy', authenticateToken, async (req, res) => {
  const { coinId, symbol, name, amount, currency = 'usd' } = req.body;

  if (!coinId || !symbol || !name || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }

  if (!isCurrencySupported(currency)) {
    return res.status(400).json({ error: 'Currency not supported' });
  }

  try {
    // Get current price in specified currency
    const priceData = await getCryptoPrice(coinId, currency);
    const currentPrice = priceData.price;
    const totalCost = amount * currentPrice;

    // Check user balance in specified currency
    getBalanceInCurrency(req.user.userId, currency, (err, userBalance) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (userBalance < totalCost) {
        return res.status(400).json({
          error: 'Insufficient balance',
          required: totalCost,
          available: userBalance,
          currency: currency.toUpperCase()
        });
      }

      // Begin transaction
      db.serialize(() => {
        // Deduct balance
        db.run(
          `INSERT INTO balances (user_id, currency, amount) VALUES (?, ?, ?)
           ON CONFLICT(user_id, currency) DO UPDATE SET amount = amount - ?`,
          [req.user.userId, currency.toLowerCase(), -totalCost, totalCost]
        );

        // Update or create portfolio entry (now with currency)
        db.get(
          'SELECT * FROM portfolio WHERE user_id = ? AND symbol = ? AND currency = ?',
          [req.user.userId, symbol.toUpperCase(), currency.toLowerCase()],
          (err, holding) => {
            if (holding) {
              // Update existing holding
              const newAmount = holding.amount + amount;
              const newAvgPrice = ((holding.average_buy_price * holding.amount) + (currentPrice * amount)) / newAmount;

              db.run(
                'UPDATE portfolio SET amount = ?, average_buy_price = ? WHERE id = ?',
                [newAmount, newAvgPrice, holding.id]
              );
            } else {
              // Create new holding
              db.run(
                'INSERT INTO portfolio (user_id, symbol, coin_id, name, amount, average_buy_price, currency) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [req.user.userId, symbol.toUpperCase(), coinId, name, amount, currentPrice, currency.toLowerCase()]
              );
            }
          }
        );

        // Log transaction
        db.run(
          'INSERT INTO transactions (user_id, symbol, coin_id, name, type, amount, price, total, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [req.user.userId, symbol.toUpperCase(), coinId, name, 'buy', amount, currentPrice, totalCost, currency.toLowerCase()],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Transaction logging failed' });
            }

            res.json({
              success: true,
              message: `Bought ${amount} ${symbol.toUpperCase()} for ${totalCost.toFixed(2)} ${currency.toUpperCase()}`,
              transaction: {
                type: 'buy',
                symbol: symbol.toUpperCase(),
                amount,
                price: currentPrice,
                total: totalCost,
                currency: currency.toUpperCase()
              }
            });
          }
        );
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete purchase: ' + error.message });
  }
});

// Sell cryptocurrency - now supports any currency
router.post('/sell', authenticateToken, async (req, res) => {
  const { coinId, symbol, amount, currency = 'usd' } = req.body;

  if (!coinId || !symbol || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }

  if (!isCurrencySupported(currency)) {
    return res.status(400).json({ error: 'Currency not supported' });
  }

  try {
    // Check if user has enough of this crypto in the specified currency
    db.get(
      'SELECT * FROM portfolio WHERE user_id = ? AND symbol = ? AND currency = ?',
      [req.user.userId, symbol.toUpperCase(), currency.toLowerCase()],
      async (err, holding) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!holding || holding.amount < amount) {
          return res.status(400).json({ error: `Insufficient ${symbol.toUpperCase()} holdings in ${currency.toUpperCase()}` });
        }

        // Get current price in specified currency
        const priceData = await getCryptoPrice(coinId, currency);
        const currentPrice = priceData.price;
        const totalValue = amount * currentPrice;

        db.serialize(() => {
          // Add to balance
          db.run(
            `INSERT INTO balances (user_id, currency, amount) VALUES (?, ?, ?)
             ON CONFLICT(user_id, currency) DO UPDATE SET amount = amount + ?`,
            [req.user.userId, currency.toLowerCase(), totalValue, totalValue]
          );

          // Update portfolio
          const newAmount = holding.amount - amount;
          if (newAmount > 0.00000001) {
            db.run(
              'UPDATE portfolio SET amount = ? WHERE id = ?',
              [newAmount, holding.id]
            );
          } else {
            // Remove holding if amount is negligible
            db.run('DELETE FROM portfolio WHERE id = ?', [holding.id]);
          }

          // Log transaction
          db.run(
            'INSERT INTO transactions (user_id, symbol, coin_id, name, type, amount, price, total, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [req.user.userId, symbol.toUpperCase(), coinId, holding.name, 'sell', amount, currentPrice, totalValue, currency.toLowerCase()],
            function (err) {
              if (err) {
                return res.status(500).json({ error: 'Transaction logging failed' });
              }

              res.json({
                success: true,
                message: `Sold ${amount} ${symbol.toUpperCase()} for ${totalValue.toFixed(2)} ${currency.toUpperCase()}`,
                transaction: {
                  type: 'sell',
                  symbol: symbol.toUpperCase(),
                  amount,
                  price: currentPrice,
                  total: totalValue,
                  currency: currency.toUpperCase()
                }
              });
            }
          );
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete sale: ' + error.message });
  }
});

// Get user's portfolio - now groups by currency
router.get('/portfolio', authenticateToken, (req, res) => {
  const currency = req.query.currency;

  let query = 'SELECT * FROM portfolio WHERE user_id = ?';
  let params = [req.user.userId];

  if (currency) {
    query += ' AND currency = ?';
    params.push(currency.toLowerCase());
  }

  query += ' ORDER BY amount * average_buy_price DESC';

  db.all(query, params, (err, holdings) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, portfolio: holdings || [] });
  });
});

// Get transaction history - now includes currency filter
router.get('/history', authenticateToken, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;
  const currency = req.query.currency;

  let query = 'SELECT * FROM transactions WHERE user_id = ?';
  let params = [req.user.userId];

  if (currency) {
    query += ' AND currency = ?';
    params.push(currency.toLowerCase());
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  db.all(query, params, (err, transactions) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, transactions: transactions || [] });
  });
});

// Get portfolio statistics - supports multi-currency
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Get all balances
    db.all(
      'SELECT currency, amount FROM balances WHERE user_id = ?',
      [req.user.userId],
      async (err, balances) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Also get legacy balance
        db.get('SELECT balance FROM users WHERE id = ?', [req.user.userId], async (err, user) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          // Compile all cash balances
          const cashBalances = {};
          balances.forEach(b => {
            cashBalances[b.currency] = b.amount;
          });

          // Add legacy USD balance
          if (user?.balance > 0) {
            cashBalances.usd = (cashBalances.usd || 0) + user.balance;
          }

          // Get portfolio holdings
          db.all(
            'SELECT * FROM portfolio WHERE user_id = ?',
            [req.user.userId],
            async (err, holdings) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }

              const cryptoValueByCurrency = {};
              const investedByCurrency = {};

              // Calculate current value of portfolio per currency
              for (const holding of holdings) {
                const currency = holding.currency || 'usd';
                const invested = holding.amount * holding.average_buy_price;

                investedByCurrency[currency] = (investedByCurrency[currency] || 0) + invested;

                try {
                  const priceData = await getCryptoPrice(holding.coin_id, currency);
                  const currentValue = holding.amount * priceData.price;
                  cryptoValueByCurrency[currency] = (cryptoValueByCurrency[currency] || 0) + currentValue;
                } catch (error) {
                  console.error(`Error fetching price for ${holding.symbol} in ${currency}`);
                }
              }

              // Calculate totals by currency
              const statsByCurrency = {};
              const allCurrencies = new Set([
                ...Object.keys(cashBalances),
                ...Object.keys(cryptoValueByCurrency)
              ]);

              allCurrencies.forEach(currency => {
                const cash = cashBalances[currency] || 0;
                const crypto = cryptoValueByCurrency[currency] || 0;
                const invested = investedByCurrency[currency] || 0;
                const total = cash + crypto;
                const profitLoss = crypto - invested;
                const profitLossPercent = invested > 0 ? (profitLoss / invested) * 100 : 0;

                statsByCurrency[currency] = {
                  cash_balance: cash,
                  crypto_value: crypto,
                  total_value: total,
                  invested,
                  profit_loss: profitLoss,
                  profit_loss_percent: profitLossPercent
                };
              });

              res.json({
                success: true,
                stats: statsByCurrency
              });
            }
          );
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate statistics' });
  }
});

module.exports = router;
