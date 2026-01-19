const express = require('express');
const router = express.Router();
const db = require('../config/database');
const axios = require('axios');
const { 
  getSupportedCurrencies, 
  getCurrencyInfo, 
  CURRENCY_INFO 
} = require('../services/currencyService');
const { authenticateToken } = require('../middleware/auth');

// Cache for exchange rates
let ratesCache = {};
let ratesCacheTime = {};
const RATES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get currency exchange rates
 * GET /api/currency/rates/:baseCurrency (optional)
 * GET /api/currency/rates?base=usd (query param)
 */
router.get('/rates/:baseCurrency?', async (req, res) => {
  try {
    const baseCurrency = (req.params.baseCurrency || req.query.base || 'usd').toLowerCase();
    const now = Date.now();
    
    console.log(`[Currency Rates] Fetching rates for base: ${baseCurrency}`);
    
    // Return cached rates if still valid
    if (ratesCache[baseCurrency] && (now - (ratesCacheTime[baseCurrency] || 0)) < RATES_CACHE_DURATION) {
      console.log(`[Currency Rates] Returning cached rates for ${baseCurrency}`);
      return res.json({
        success: true,
        base: baseCurrency.toUpperCase(),
        rates: ratesCache[baseCurrency],
        cached: true
      });
    }

    // Fetch fresh rates from CoinGecko
    const currencies = getSupportedCurrencies().join(',');
    console.log(`[Currency Rates] Fetching from CoinGecko for currencies: ${currencies}`);
    
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'tether', // USDT as proxy for all currencies
        vs_currencies: currencies
      }
    });

    const usdRates = response.data.tether || {};
    console.log(`[Currency Rates] Got rates from CoinGecko:`, Object.keys(usdRates));
    
    // Calculate rates relative to base currency
    let rates = {};
    const baseRate = usdRates[baseCurrency] || 1;
    
    if (!usdRates[baseCurrency]) {
      console.warn(`[Currency Rates] Base currency ${baseCurrency} not found in rates, using 1`);
    }
    
    Object.keys(usdRates).forEach(currency => {
      // Rate from base to target = (usd to target) / (usd to base)
      // Ensure keys are lowercase
      rates[currency.toLowerCase()] = usdRates[currency] / baseRate;
    });
    
    console.log(`[Currency Rates] Calculated rates relative to ${baseCurrency}:`, Object.keys(rates));
    
    // Cache the rates
    ratesCache[baseCurrency] = rates;
    ratesCacheTime[baseCurrency] = now;

    res.json({
      success: true,
      base: baseCurrency.toUpperCase(),
      rates,
      cached: false
    });
  } catch (error) {
    console.error('[Currency Rates] Error fetching rates:', error.message);
    
    const baseCurrency = (req.params.baseCurrency || req.query.base || 'usd').toLowerCase();
    
    // Return cached rates if available, even if expired
    if (ratesCache[baseCurrency]) {
      console.log(`[Currency Rates] Returning stale cached rates for ${baseCurrency}`);
      return res.json({
        success: true,
        base: baseCurrency.toUpperCase(),
        rates: ratesCache[baseCurrency],
        cached: true,
        stale: true
      });
    }
    
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch currency rates' 
    });
  }
});

/**
 * Exchange currency (convert from one currency to another)
 * POST /api/currency/exchange
 * Body: { fromCurrency, toCurrency, amount }
 */
router.post('/exchange', authenticateToken, async (req, res) => {
  const { fromCurrency, toCurrency, amount } = req.body;

  if (!fromCurrency || !toCurrency || !amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid request parameters' });
  }

  const fromCurr = fromCurrency.toLowerCase();
  const toCurr = toCurrency.toLowerCase();

  try {
    // Get exchange rate
    const currencies = getSupportedCurrencies().join(',');
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'tether',
        vs_currencies: currencies
      }
    });

    const usdRates = response.data.tether || {};
    const fromRate = usdRates[fromCurr];
    const toRate = usdRates[toCurr];
    
    if (!fromRate || !toRate) {
      return res.status(400).json({ error: 'Currency not supported' });
    }

    const exchangeRate = toRate / fromRate;
    const convertedAmount = amount * exchangeRate;

    // Check if user has enough balance in source currency
    db.get(
      'SELECT amount FROM balances WHERE user_id = ? AND currency = ?',
      [req.user.userId, fromCurr],
      (err, balance) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Also check legacy balance for USD
        db.get('SELECT balance FROM users WHERE id = ?', [req.user.userId], (err, user) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          let availableBalance = balance?.amount || 0;
          if (fromCurr === 'usd') {
            availableBalance += (user?.balance || 0);
          }

          if (availableBalance < amount) {
            return res.status(400).json({
              error: 'Insufficient balance',
              required: amount,
              available: availableBalance
            });
          }

          // Deduct from source currency
          db.run(
            `INSERT INTO balances (user_id, currency, amount) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE amount = amount - ?`,
            [req.user.userId, fromCurr, -amount, amount],
            function (err) {
              if (err) {
                return res.status(500).json({ error: 'Failed to deduct balance' });
              }

              // Add to target currency
              db.run(
                `INSERT INTO balances (user_id, currency, amount) VALUES (?, ?, ?)
                 ON DUPLICATE KEY UPDATE amount = amount + ?`,
                [req.user.userId, toCurr, convertedAmount, convertedAmount],
                function (err) {
                  if (err) {
                    return res.status(500).json({ error: 'Failed to add balance' });
                  }

                  // Log the exchange transaction
                  db.run(
                    'INSERT INTO transactions (user_id, symbol, coin_id, name, type, amount, price, total, currency) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                      req.user.userId,
                      `${fromCurr.toUpperCase()}-${toCurr.toUpperCase()}`,
                      'exchange',
                      `Currency Exchange: ${fromCurr.toUpperCase()} to ${toCurr.toUpperCase()}`,
                      'exchange',
                      amount,
                      exchangeRate,
                      convertedAmount,
                      toCurr
                    ],
                    function (err) {
                      if (err) {
                        console.error('Transaction logging failed:', err);
                      }

                      res.json({
                        success: true,
                        message: `Exchanged ${amount} ${fromCurr.toUpperCase()} to ${convertedAmount.toFixed(2)} ${toCurr.toUpperCase()}`,
                        exchange: {
                          from: fromCurr.toUpperCase(),
                          to: toCurr.toUpperCase(),
                          amount,
                          rate: exchangeRate,
                          converted: convertedAmount
                        }
                      });
                    }
                  );
                }
              );
            }
          );
        });
      }
    );
  } catch (error) {
    console.error('Exchange error:', error);
    res.status(500).json({ error: 'Failed to complete exchange: ' + error.message });
  }
});

/**
 * Get list of all supported currencies
 * GET /api/currency/supported
 */
router.get('/supported', (req, res) => {
  const currencies = getSupportedCurrencies();
  const currencyList = currencies.map(code => ({
    code: code.toUpperCase(),
    ...getCurrencyInfo(code)
  }));
  
  res.json({
    success: true,
    currencies: currencyList
  });
});

/**
 * Get user's balances in all currencies
 * GET /api/currency/balances
 */
router.get('/balances', authenticateToken, (req, res) => {
  // Get balances from balances table
  db.all(
    'SELECT currency, amount FROM balances WHERE user_id = ?',
    [req.user.userId],
    (err, balances) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Also get legacy USD balance from users table
      db.get('SELECT balance FROM users WHERE id = ?', [req.user.userId], (err, user) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }

        // Compile all balances
        const allBalances = {};
        
        // Add balances from balances table
        balances.forEach(b => {
          allBalances[b.currency] = b.amount;
        });

        // Add legacy USD balance if exists
        if (user?.balance > 0) {
          allBalances.usd = (allBalances.usd || 0) + user.balance;
        }

        // Format response with currency info
        const formattedBalances = Object.entries(allBalances).map(([currency, amount]) => ({
          currency: currency.toUpperCase(),
          amount,
          ...getCurrencyInfo(currency)
        }));

        res.json({
          success: true,
          balances: formattedBalances
        });
      });
    }
  );
});

/**
 * Get list of all supported currencies (alias)
 * GET /api/currency/list
 */
router.get('/list', (req, res) => {
  const currencies = getSupportedCurrencies();
  const currencyList = currencies.map(code => ({
    code: code.toUpperCase(),
    ...getCurrencyInfo(code)
  }));
  
  res.json({
    success: true,
    currencies: currencyList
  });
});

/**
 * Get information about a specific currency
 * GET /api/currency/:code
 */
router.get('/:code', (req, res) => {
  const { code } = req.params;
  const info = getCurrencyInfo(code);
  
  if (!info) {
    return res.status(404).json({
      success: false,
      error: 'Currency not supported'
    });
  }
  
  res.json({
    success: true,
    currency: {
      code: code.toUpperCase(),
      ...info
    }
  });
});

module.exports = router;