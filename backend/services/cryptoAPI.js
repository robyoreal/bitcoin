const axios = require('axios');

const COINGECKO_API = 'https://api.coingecko.com/api/v3';

// Cache for price data (to avoid hitting rate limits)
const priceCache = new Map();
const CACHE_DURATION = 60000; // 1 minute

// Get list of top cryptocurrencies
async function getTopCryptos(limit = 50, currency = 'usd') {
  try {
    const response = await axios.get(`${COINGECKO_API}/coins/markets`, {
      params: {
        vs_currency: currency.toLowerCase(),
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
      image: coin.image,
      currency: currency.toLowerCase()
    }));
  } catch (error) {
    console.error('Error fetching top cryptos:', error.message);
    throw new Error('Failed to fetch cryptocurrency data');
  }
}

// Get current price for specific crypto
async function getCryptoPrice(coinId, currency = 'usd') {
  const cacheKey = `price_${coinId}_${currency}`;
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await axios.get(`${COINGECKO_API}/simple/price`, {
      params: {
        ids: coinId,
        vs_currencies: currency.toLowerCase(),
        include_24hr_change: true
      }
    });

    const currencyLower = currency.toLowerCase();
    const data = {
      price: response.data[coinId][currencyLower],
      change_24h: response.data[coinId][`${currencyLower}_24h_change`],
      currency: currencyLower
    };

    priceCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error('Error fetching crypto price:', error.message);
    throw new Error('Failed to fetch price data');
  }
}

// Get crypto price in multiple currencies at once
async function getCryptoPriceMultiCurrency(coinId, currencies = ['usd', 'eur', 'gbp']) {
  const currencyString = Array.isArray(currencies) ? currencies.join(',') : currencies;
  const cacheKey = `price_multi_${coinId}_${currencyString}`;
  const cached = priceCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    const response = await axios.get(`${COINGECKO_API}/simple/price`, {
      params: {
        ids: coinId,
        vs_currencies: currencyString.toLowerCase(),
        include_24hr_change: true
      }
    });

    const data = response.data[coinId];
    priceCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error('Error fetching crypto prices:', error.message);
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
  getCryptoPriceMultiCurrency,
  searchCrypto
};
