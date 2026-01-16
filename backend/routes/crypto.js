const express = require('express');
const router = express.Router();
const { getTopCryptos, getCryptoPrice, searchCrypto } = require('../services/cryptoAPI');
const { authenticateToken } = require('../middleware/auth');

// Get top cryptocurrencies by market cap
router.get('/top', authenticateToken, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const cryptos = await getTopCryptos(limit);
    res.json({ success: true, data: cryptos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get price for specific cryptocurrency
router.get('/price/:coinId', authenticateToken, async (req, res) => {
  try {
    const { coinId } = req.params;
    const priceData = await getCryptoPrice(coinId);
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

module.exports = router;
