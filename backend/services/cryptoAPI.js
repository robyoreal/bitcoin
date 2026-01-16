const axios = require('axios');

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Cache for price data (to avoid hitting rate limits)
const priceCache = new Map();
const CACHE_DURATION = 60000; // 1 minute

// Get list of top cryptocurrencies
async function getTopCryptos(limit = 50) {
  try {
    const response = await axios.get(`${COINGECKO_API}/coins/markets`, {
      params: {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: limit,
        page: 1,
        sparkline: false
      }
    });

    return response.data.map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      current_price: coin.current_price,
      market_cap: coin.market_cap,
      price_change_24h: coin.price_change_percentage_24h,
      image: coin.image
    }));
  } catch (error) {
    console.error('Error fetching top cryptos:', error.message);
    throw new Error('Failed to fetch cryptocurrency data');
  }
}

// Get current price for specific crypto
async function getCryptoPrice(coinId) {
  const cacheKey = `price_${coinId}`;
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await axios.get(`${COINGECKO_API}/simple/price`, {
      params: {
        ids: coinId,
        vs_currencies: 'usd',
        include_24hr_change: true
      }
    });

    const data = {
      price: response.data[coinId].usd,
      change_24h: response.data[coinId].usd_24h_change
    };

    priceCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error('Error fetching crypto price:', error.message);
    throw new Error('Failed to fetch price data');
  }
}

// Search for cryptocurrencies
async function searchCrypto(query) {
  try {
    const response = await axios.get(`${COINGECKO_API}/search`, {
      params: { query }
    });

    return response.data.coins.slice(0, 10).map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      thumb: coin.thumb
    }));
  } catch (error) {
    console.error('Error searching crypto:', error.message);
    throw new Error('Failed to search cryptocurrencies');
  }
}

module.exports = {
  getTopCryptos,
  getCryptoPrice,
  searchCrypto
};
