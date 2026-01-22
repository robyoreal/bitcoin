const axios = require('axios');
const { getCacheInstance } = require('./cacheService');

const cache = getCacheInstance();

// API Providers configuration with their endpoints and rate limit info
const API_PROVIDERS = {
  coingecko: {
    name: 'CoinGecko',
    baseUrl: 'https://api.coingecko.com/api/v3',
    rateLimit: { calls: 10, period: 60000 }, // 10 calls per minute
    lastCallTime: 0,
    callCount: 0
  },
  coincap: {
    name: 'CoinCap',
    baseUrl: 'https://api.coincap.io/v2',
    rateLimit: { calls: 200, period: 60000 }, // 200 calls per minute
    lastCallTime: 0,
    callCount: 0
  },
  binance: {
    name: 'Binance',
    baseUrl: 'https://api.binance.com/api/v3',
    rateLimit: { calls: 1200, period: 60000 }, // 1200 calls per minute
    lastCallTime: 0,
    callCount: 0
  },
  cryptocompare: {
    name: 'CryptoCompare',
    baseUrl: 'https://min-api.cryptocompare.com/data',
    rateLimit: { calls: 100, period: 60000 }, // ~100 calls per minute (free tier)
    lastCallTime: 0,
    callCount: 0
  }
};

// Symbol mapping for different exchanges
const SYMBOL_MAPPING = {
  binance: {
    'bitcoin': 'BTCUSDT',
    'ethereum': 'ETHUSDT',
    'ripple': 'XRPUSDT',
    'cardano': 'ADAUSDT',
    'dogecoin': 'DOGEUSDT',
    'polkadot': 'DOTUSDT',
    'litecoin': 'LTCUSDT',
    'bitcoin-cash': 'BCHUSDT',
    'chainlink': 'LINKUSDT',
    'stellar': 'XLMUSDT',
    'uniswap': 'UNIUSDT',
    'solana': 'SOLUSDT',
    'polygon': 'MATICUSDT',
    'avalanche-2': 'AVAXUSDT',
    'tron': 'TRXUSDT'
  },
  cryptocompare: {
    'bitcoin': 'BTC',
    'ethereum': 'ETH',
    'ripple': 'XRP',
    'cardano': 'ADA',
    'dogecoin': 'DOGE',
    'polkadot': 'DOT',
    'litecoin': 'LTC',
    'bitcoin-cash': 'BCH',
    'chainlink': 'LINK',
    'stellar': 'XLM',
    'uniswap': 'UNI',
    'solana': 'SOL',
    'polygon': 'MATIC',
    'avalanche-2': 'AVAX',
    'tron': 'TRX'
  },
  coincap: {
    'bitcoin': 'bitcoin',
    'ethereum': 'ethereum',
    'ripple': 'xrp',
    'cardano': 'cardano',
    'dogecoin': 'dogecoin',
    'polkadot': 'polkadot',
    'litecoin': 'litecoin',
    'bitcoin-cash': 'bitcoin-cash',
    'chainlink': 'chainlink',
    'stellar': 'stellar',
    'uniswap': 'uniswap',
    'solana': 'solana',
    'polygon': 'polygon',
    'avalanche-2': 'avalanche',
    'tron': 'tron'
  }
};

// Check if provider has exceeded rate limit
function isRateLimited(provider) {
  const config = API_PROVIDERS[provider];
  const now = Date.now();

  // Reset counter if period has passed
  if (now - config.lastCallTime > config.rateLimit.period) {
    config.callCount = 0;
    config.lastCallTime = now;
  }

  return config.callCount >= config.rateLimit.calls;
}

// Record API call for rate limiting
function recordAPICall(provider) {
  const config = API_PROVIDERS[provider];
  config.callCount++;
  config.lastCallTime = Date.now();
}

// ===== TOP CRYPTOCURRENCIES =====

async function fetchTopCryptosFromCoinGecko(limit, currency) {
  try {
    if (isRateLimited('coingecko')) {
      throw new Error('Rate limit exceeded');
    }

    recordAPICall('coingecko');

    const response = await axios.get(`${API_PROVIDERS.coingecko.baseUrl}/coins/markets`, {
      params: {
        vs_currency: currency.toLowerCase(),
        order: 'market_cap_desc',
        per_page: limit,
        page: 1,
        sparkline: false
      },
      timeout: 5000
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
    console.error('CoinGecko API error (top cryptos):', error.message);
    throw error;
  }
}

async function fetchTopCryptosFromCoinCap(limit) {
  try {
    if (isRateLimited('coincap')) {
      throw new Error('Rate limit exceeded');
    }

    recordAPICall('coincap');

    const response = await axios.get(`${API_PROVIDERS.coincap.baseUrl}/assets`, {
      params: {
        limit
      },
      timeout: 5000
    });

    return response.data.data.map((coin, index) => ({
      id: SYMBOL_MAPPING.coincap[coin.id] ? Object.keys(SYMBOL_MAPPING.coincap).find(key => SYMBOL_MAPPING.coincap[key] === coin.id) : coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      current_price: parseFloat(coin.priceUsd),
      market_cap: parseFloat(coin.marketCapUsd),
      price_change_24h: parseFloat(coin.changePercent24Hr),
      image: `https://assets.coincap.io/assets/icons/${coin.symbol.toLowerCase()}@2x.png`,
      currency: 'usd'
    }));
  } catch (error) {
    console.error('CoinCap API error (top cryptos):', error.message);
    throw error;
  }
}

// Get list of top cryptocurrencies with fallback
async function getTopCryptos(limit = 50, currency = 'usd') {
  const cacheKey = `top_cryptos_${limit}_${currency}`;

  // Check cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    console.log(`Returning cached top cryptos data`);
    return cached;
  }

  // Try providers in order with automatic fallback
  const providers = ['coingecko', 'coincap'];

  for (const provider of providers) {
    try {
      console.log(`Attempting to fetch top cryptos from ${API_PROVIDERS[provider].name}...`);

      let data;
      switch (provider) {
        case 'coingecko':
          data = await fetchTopCryptosFromCoinGecko(limit, currency);
          break;
        case 'coincap':
          data = await fetchTopCryptosFromCoinCap(limit);
          break;
      }

      if (data && data.length > 0) {
        console.log(`Successfully fetched ${data.length} cryptos from ${API_PROVIDERS[provider].name}`);
        await cache.set(cacheKey, data, cache.defaultTTL.topCryptos);
        return data;
      }
    } catch (error) {
      console.log(`${API_PROVIDERS[provider].name} failed: ${error.message}. Trying next provider...`);
      continue;
    }
  }

  throw new Error('All API providers failed to fetch top cryptocurrencies');
}

// ===== CRYPTO PRICE =====

async function fetchPriceFromCoinGecko(coinId, currency) {
  try {
    if (isRateLimited('coingecko')) {
      throw new Error('Rate limit exceeded');
    }

    recordAPICall('coingecko');

    const response = await axios.get(`${API_PROVIDERS.coingecko.baseUrl}/simple/price`, {
      params: {
        ids: coinId,
        vs_currencies: currency.toLowerCase(),
        include_24hr_change: true
      },
      timeout: 5000
    });

    const currencyLower = currency.toLowerCase();
    return {
      price: response.data[coinId][currencyLower],
      change_24h: response.data[coinId][`${currencyLower}_24h_change`],
      currency: currencyLower
    };
  } catch (error) {
    console.error('CoinGecko API error (price):', error.message);
    throw error;
  }
}

async function fetchPriceFromCoinCap(coinId) {
  try {
    if (isRateLimited('coincap')) {
      throw new Error('Rate limit exceeded');
    }

    const assetId = SYMBOL_MAPPING.coincap[coinId] || coinId;

    recordAPICall('coincap');

    const response = await axios.get(`${API_PROVIDERS.coincap.baseUrl}/assets/${assetId}`, {
      timeout: 5000
    });

    return {
      price: parseFloat(response.data.data.priceUsd),
      change_24h: parseFloat(response.data.data.changePercent24Hr),
      currency: 'usd'
    };
  } catch (error) {
    console.error('CoinCap API error (price):', error.message);
    throw error;
  }
}

async function fetchPriceFromBinance(coinId) {
  try {
    if (isRateLimited('binance')) {
      throw new Error('Rate limit exceeded');
    }

    const symbol = SYMBOL_MAPPING.binance[coinId];
    if (!symbol) {
      throw new Error(`Symbol not mapped for ${coinId}`);
    }

    recordAPICall('binance');

    const [priceResponse, statsResponse] = await Promise.all([
      axios.get(`${API_PROVIDERS.binance.baseUrl}/ticker/price`, {
        params: { symbol },
        timeout: 5000
      }),
      axios.get(`${API_PROVIDERS.binance.baseUrl}/ticker/24hr`, {
        params: { symbol },
        timeout: 5000
      })
    ]);

    return {
      price: parseFloat(priceResponse.data.price),
      change_24h: parseFloat(statsResponse.data.priceChangePercent),
      currency: 'usd'
    };
  } catch (error) {
    console.error('Binance API error (price):', error.message);
    throw error;
  }
}

async function fetchPriceFromCryptoCompare(coinId) {
  try {
    if (isRateLimited('cryptocompare')) {
      throw new Error('Rate limit exceeded');
    }

    const symbol = SYMBOL_MAPPING.cryptocompare[coinId];
    if (!symbol) {
      throw new Error(`Symbol not mapped for ${coinId}`);
    }

    recordAPICall('cryptocompare');

    const response = await axios.get(`${API_PROVIDERS.cryptocompare.baseUrl}/pricemultifull`, {
      params: {
        fsyms: symbol,
        tsyms: 'USD'
      },
      timeout: 5000
    });

    const data = response.data.RAW[symbol].USD;
    return {
      price: data.PRICE,
      change_24h: data.CHANGEPCT24HOUR,
      currency: 'usd'
    };
  } catch (error) {
    console.error('CryptoCompare API error (price):', error.message);
    throw error;
  }
}

// Get current price for specific crypto with fallback
async function getCryptoPrice(coinId, currency = 'usd') {
  const cacheKey = `price_${coinId}_${currency}`;

  // Check cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    console.log(`Returning cached price data for ${coinId}`);
    return cached;
  }

  // Try providers in order with automatic fallback
  const providers = ['coingecko', 'coincap', 'binance', 'cryptocompare'];

  for (const provider of providers) {
    try {
      console.log(`Attempting to fetch price from ${API_PROVIDERS[provider].name}...`);

      let data;
      switch (provider) {
        case 'coingecko':
          data = await fetchPriceFromCoinGecko(coinId, currency);
          break;
        case 'coincap':
          data = await fetchPriceFromCoinCap(coinId);
          break;
        case 'binance':
          data = await fetchPriceFromBinance(coinId);
          break;
        case 'cryptocompare':
          data = await fetchPriceFromCryptoCompare(coinId);
          break;
      }

      if (data && data.price) {
        console.log(`Successfully fetched price from ${API_PROVIDERS[provider].name}`);
        await cache.set(cacheKey, data, cache.defaultTTL.cryptoPrices);
        return data;
      }
    } catch (error) {
      console.log(`${API_PROVIDERS[provider].name} failed: ${error.message}. Trying next provider...`);
      continue;
    }
  }

  throw new Error('All API providers failed to fetch cryptocurrency price');
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
    // For multi-currency, we'll primarily use CoinGecko as it supports this natively
    if (!isRateLimited('coingecko')) {
      recordAPICall('coingecko');

      const response = await axios.get(`${API_PROVIDERS.coingecko.baseUrl}/simple/price`, {
        params: {
          ids: coinId,
          vs_currencies: currencyString.toLowerCase(),
          include_24hr_change: true
        },
        timeout: 5000
      });

      const data = response.data[coinId];
      await cache.set(cacheKey, data, cache.defaultTTL.cryptoPrices);
      return data;
    }

    throw new Error('CoinGecko rate limited and no fallback for multi-currency');
  } catch (error) {
    console.error('Error fetching crypto prices:', error.message);
    throw new Error('Failed to fetch price data');
  }
}

// ===== SEARCH CRYPTOCURRENCIES =====

async function searchCryptoFromCoinGecko(query) {
  try {
    if (isRateLimited('coingecko')) {
      throw new Error('Rate limit exceeded');
    }

    recordAPICall('coingecko');

    const response = await axios.get(`${API_PROVIDERS.coingecko.baseUrl}/search`, {
      params: { query },
      timeout: 5000
    });

    return response.data.coins.slice(0, 10).map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      thumb: coin.thumb
    }));
  } catch (error) {
    console.error('CoinGecko API error (search):', error.message);
    throw error;
  }
}

async function searchCryptoFromCoinCap(query) {
  try {
    if (isRateLimited('coincap')) {
      throw new Error('Rate limit exceeded');
    }

    recordAPICall('coincap');

    const response = await axios.get(`${API_PROVIDERS.coincap.baseUrl}/assets`, {
      params: {
        search: query,
        limit: 10
      },
      timeout: 5000
    });

    return response.data.data.map(coin => ({
      id: coin.id,
      symbol: coin.symbol.toUpperCase(),
      name: coin.name,
      thumb: `https://assets.coincap.io/assets/icons/${coin.symbol.toLowerCase()}@2x.png`
    }));
  } catch (error) {
    console.error('CoinCap API error (search):', error.message);
    throw error;
  }
}

// Search for cryptocurrencies with fallback
async function searchCrypto(query) {
  const cacheKey = `search_${query.toLowerCase()}`;

  // Check cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    console.log(`Returning cached search results for "${query}"`);
    return cached;
  }

  // Try providers in order with automatic fallback
  const providers = ['coingecko', 'coincap'];

  for (const provider of providers) {
    try {
      console.log(`Attempting to search from ${API_PROVIDERS[provider].name}...`);

      let data;
      switch (provider) {
        case 'coingecko':
          data = await searchCryptoFromCoinGecko(query);
          break;
        case 'coincap':
          data = await searchCryptoFromCoinCap(query);
          break;
      }

      if (data && data.length > 0) {
        console.log(`Successfully fetched ${data.length} search results from ${API_PROVIDERS[provider].name}`);
        await cache.set(cacheKey, data, cache.defaultTTL.searchResults);
        return data;
      }
    } catch (error) {
      console.log(`${API_PROVIDERS[provider].name} failed: ${error.message}. Trying next provider...`);
      continue;
    }
  }

  // If all providers fail, return empty array for search
  console.log('All providers failed for search, returning empty results');
  return [];
}

// Get available rate limit status for all providers
function getRateLimitStatus() {
  const status = {};

  for (const [key, provider] of Object.entries(API_PROVIDERS)) {
    const now = Date.now();
    const timeSinceLastCall = now - provider.lastCallTime;
    const resetIn = Math.max(0, provider.rateLimit.period - timeSinceLastCall);

    status[key] = {
      name: provider.name,
      callsMade: provider.callCount,
      callsLimit: provider.rateLimit.calls,
      isLimited: isRateLimited(key),
      resetInMs: resetIn
    };
  }

  return status;
}

module.exports = {
  getTopCryptos,
  getCryptoPrice,
  getCryptoPriceMultiCurrency,
  searchCrypto,
  getRateLimitStatus
};
