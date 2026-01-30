const express = require('express');
const router = express.Router();
const { getTopCryptos, getCryptoPrice, getCryptoPriceMultiCurrency, searchCrypto, getRateLimitStatus: getCryptoRateLimitStatus } = require('../services/cryptoAPI');
const { getHistoricalPrices, getRateLimitStatus: getHistoricalRateLimitStatus } = require('../services/historicalPriceAPI');
const { authenticateToken } = require('../middleware/auth');

// Get top cryptocurrencies by market cap
router.get('/top', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const currency = req.query.currency || 'usd';
    const cryptos = await getTopCryptos(limit, currency);
    res.json({ success: true, data: cryptos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get price for specific cryptocurrency
router.get('/price/:coinId', authenticateToken, async (req, res) => {
  try {
    const { coinId } = req.params;
    const currency = req.query.currency || 'usd';
    const priceData = await getCryptoPrice(coinId, currency);
    res.json({ success: true, data: priceData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search cryptocurrencies
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    const results = await searchCrypto(q);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get historical prices for a cryptocurrency
router.get('/historical/:coinId', authenticateToken, async (req, res) => {
  try {
    const { coinId } = req.params;
    const days = parseInt(req.query.days) || 7;
    const currency = req.query.currency || 'usd';

    // Validate days parameter
    if (![1, 7, 30, 365].includes(days)) {
      return res.status(400).json({ error: 'Days must be 1, 7, 30, or 365' });
    }

    const historicalData = await getHistoricalPrices(coinId, days, currency);
    res.json({ success: true, data: historicalData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get rate limit status for all API providers
router.get('/rate-limit-status', authenticateToken, async (req, res) => {
  try {
    const cryptoStatus = getCryptoRateLimitStatus();
    const historicalStatus = getHistoricalRateLimitStatus();

    // Merge statuses from both services
    const status = {
      current_prices: cryptoStatus,
      historical_prices: historicalStatus
    };

    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
