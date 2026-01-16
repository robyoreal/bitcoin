const axios = require('axios');
const { getCacheInstance } = require('./cacheService');

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const cache = getCacheInstance();

// Get list of top cryptocurrencies
async function getTopCryptos(limit = 50, currency = 'usd') {
  const cacheKey = `top_cryptos_${limit}_${currency}`;

  // Check cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }

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

    const data = response.data.map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      current_price: coin.current_price,
      market_cap: coin.market_cap,
      price_change_24h: coin.price_change_percentage_24h,
      image: coin.image,
      currency: currency.toLowerCase()
    }));

    // Cache the result
    await cache.set(cacheKey, data, cache.defaultTTL.topCryptos);
    return data;
  } catch (error) {
    console.error('Error fetching top cryptos:', error.message);
    throw new Error('Failed to fetch cryptocurrency data');
  }
}

// Get current price for specific crypto
async function getCryptoPrice(coinId, currency = 'usd') {
  const cacheKey = `price_${coinId}_${currency}`;

  // Check cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
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

    // Cache the result
    await cache.set(cacheKey, data, cache.defaultTTL.cryptoPrices);
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

  // Check cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
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

    // Cache the result
    await cache.set(cacheKey, data, cache.defaultTTL.cryptoPrices);
    return data;
  } catch (error) {
    console.error('Error fetching crypto prices:', error.message);
    throw new Error('Failed to fetch price data');
  }
}

// Search for cryptocurrencies
async function searchCrypto(query) {
  const cacheKey = `search_${query.toLowerCase()}`;

  // Check cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const response = await axios.get(`${COINGECKO_API}/search`, {
      params: { query }
    });

    const data = response.data.coins.slice(0, 10).map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      thumb: coin.thumb
    }));

    // Cache the result
    await cache.set(cacheKey, data, cache.defaultTTL.searchResults);
    return data;
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
