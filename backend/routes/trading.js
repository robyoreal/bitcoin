const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { getCryptoPrice } = require('../services/cryptoAPI');
const { authenticateToken } = require('../middleware/auth');

// Get user's current balance
router.get('/balance', authenticateToken, (req, res) => {
  db.get('SELECT balance FROM users WHERE id = ?', [req.user.userId], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json({ success: true, balance: row.balance });
  });
});

// Top up balance (add virtual money)
router.post('/topup', authenticateToken, (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [amount, req.user.userId], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Log deposit transaction
    db.run(
      'INSERT INTO transactions (user_id, symbol, coin_id, name, type, amount, price, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [req.user.userId, 'USD', 'usd', 'US Dollar', 'deposit', amount, 1, amount]
    );

    db.get('SELECT balance FROM users WHERE id = ?', [req.user.userId], (err, row) => {
      res.json({
        success: true,
        message: `Added $${amount.toFixed(2)} to your balance`,
        new_balance: row.balance
      });
    });
  });
});

// Buy cryptocurrency
router.post('/buy', authenticateToken, async (req, res) => {
  const { coinId, symbol, name, amount } = req.body;

  if (!coinId || !symbol || !name || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }

  try {
    // Get current price
    const priceData = await getCryptoPrice(coinId);
    const currentPrice = priceData.price;
    const totalCost = amount * currentPrice;

    // Check user balance
    db.get('SELECT balance FROM users WHERE id = ?', [req.user.userId], (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (user.balance < totalCost) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }

      // Begin transaction
      db.serialize(() => {
        // Deduct balance
        db.run('UPDATE users SET balance = balance - ? WHERE id = ?', [totalCost, req.user.userId]);

        // Update or create portfolio entry
        db.get(
          'SELECT * FROM portfolio WHERE user_id = ? AND symbol = ?',
          [req.user.userId, symbol.toUpperCase()],
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
                'INSERT INTO portfolio (user_id, symbol, coin_id, name, amount, average_buy_price) VALUES (?, ?, ?, ?, ?, ?)',
                [req.user.userId, symbol.toUpperCase(), coinId, name, amount, currentPrice]
              );
            }
          }
        );

        // Log transaction
        db.run(
          'INSERT INTO transactions (user_id, symbol, coin_id, name, type, amount, price, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [req.user.userId, symbol.toUpperCase(), coinId, name, 'buy', amount, currentPrice, totalCost],
          function (err) {
            if (err) {
              return res.status(500).json({ error: 'Transaction logging failed' });
            }

            res.json({
              success: true,
              message: `Bought ${amount} ${symbol.toUpperCase()} for $${totalCost.toFixed(2)}`,
              transaction: {
                type: 'buy',
                symbol: symbol.toUpperCase(),
                amount,
                price: currentPrice,
                total: totalCost
              }
            });
          }
        );
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete purchase' });
  }
});

// Sell cryptocurrency
router.post('/sell', authenticateToken, async (req, res) => {
  const { coinId, symbol, amount } = req.body;

  if (!coinId || !symbol || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }

  try {
    // Check if user has enough of this crypto
    db.get(
      'SELECT * FROM portfolio WHERE user_id = ? AND symbol = ?',
      [req.user.userId, symbol.toUpperCase()],
      async (err, holding) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        if (!holding || holding.amount < amount) {
          return res.status(400).json({ error: 'Insufficient crypto holdings' });
        }

        // Get current price
        const priceData = await getCryptoPrice(coinId);
        const currentPrice = priceData.price;
        const totalValue = amount * currentPrice;

        db.serialize(() => {
          // Add to balance
          db.run('UPDATE users SET balance = balance + ? WHERE id = ?', [totalValue, req.user.userId]);

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
            'INSERT INTO transactions (user_id, symbol, coin_id, name, type, amount, price, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [req.user.userId, symbol.toUpperCase(), coinId, holding.name, 'sell', amount, currentPrice, totalValue],
            function (err) {
              if (err) {
                return res.status(500).json({ error: 'Transaction logging failed' });
              }

              res.json({
                success: true,
                message: `Sold ${amount} ${symbol.toUpperCase()} for $${totalValue.toFixed(2)}`,
                transaction: {
                  type: 'sell',
                  symbol: symbol.toUpperCase(),
                  amount,
                  price: currentPrice,
                  total: totalValue
                }
              });
            }
          );
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Failed to complete sale' });
  }
});

// Get user's portfolio
router.get('/portfolio', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM portfolio WHERE user_id = ? ORDER BY amount * average_buy_price DESC',
    [req.user.userId],
    (err, holdings) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, portfolio: holdings || [] });
    }
  );
});

// Get transaction history
router.get('/history', authenticateToken, (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  db.all(
    'SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [req.user.userId, limit, offset],
    (err, transactions) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json({ success: true, transactions: transactions || [] });
    }
  );
});

// Get portfolio statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // Get user balance
    db.get('SELECT balance FROM users WHERE id = ?', [req.user.userId], async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Get portfolio holdings
      db.all('SELECT * FROM portfolio WHERE user_id = ?', [req.user.userId], async (err, holdings) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        let totalInvested = 0;
        let currentValue = 0;

        // Calculate current value of portfolio
        for (const holding of holdings) {
          const invested = holding.amount * holding.average_buy_price;
          totalInvested += invested;

          try {
            const priceData = await getCryptoPrice(holding.coin_id);
            currentValue += holding.amount * priceData.price;
          } catch (error) {
            console.error(`Error fetching price for ${holding.symbol}`);
          }
        }

        const totalValue = user.balance + currentValue;
        const profitLoss = currentValue - totalInvested;
        const profitLossPercent = totalInvested > 0 ? (profitLoss / totalInvested) * 100 : 0;

        res.json({
          success: true,
          stats: {
            cash_balance: user.balance,
            crypto_value: currentValue,
            total_value: totalValue,
            invested: totalInvested,
            profit_loss: profitLoss,
            profit_loss_percent: profitLossPercent
          }
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate statistics' });
  }
});

module.exports = router;
