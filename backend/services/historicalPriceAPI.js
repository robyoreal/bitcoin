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
  },
  kraken: {
    name: 'Kraken',
    baseUrl: 'https://api.kraken.com/0/public',
    rateLimit: { calls: 15, period: 1000 }, // 15 calls per second
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
  kraken: {
    'bitcoin': 'XXBTZUSD',
    'ethereum': 'XETHZUSD',
    'ripple': 'XXRPZUSD',
    'cardano': 'ADAUSD',
    'dogecoin': 'XDGUSD',
    'polkadot': 'DOTUSD',
    'litecoin': 'XLTCZUSD',
    'bitcoin-cash': 'BCHUSD',
    'chainlink': 'LINKUSD',
    'stellar': 'XXLMZUSD',
    'uniswap': 'UNIUSD',
    'solana': 'SOLUSD',
    'polygon': 'MATICUSD',
    'avalanche-2': 'AVAXUSD',
    'tron': 'TRXUSD'
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

// Fetch historical data from CoinGecko
async function fetchFromCoinGecko(coinId, days, currency = 'usd') {
  try {
    if (isRateLimited('coingecko')) {
      throw new Error('Rate limit exceeded');
    }

    recordAPICall('coingecko');

    const response = await axios.get(`${API_PROVIDERS.coingecko.baseUrl}/coins/${coinId}/market_chart`, {
      params: {
        vs_currency: currency.toLowerCase(),
        days: days === 1 ? 1 : days,
        interval: days === 1 ? 'hourly' : 'daily'
      },
      timeout: 5000
    });

    return response.data.prices.map(([timestamp, price]) => ({
      timestamp,
      price,
      date: new Date(timestamp).toISOString()
    }));
  } catch (error) {
    console.error('CoinGecko API error:', error.message);
    throw error;
  }
}

// Fetch historical data from CoinCap
async function fetchFromCoinCap(coinId, days) {
  try {
    if (isRateLimited('coincap')) {
      throw new Error('Rate limit exceeded');
    }

    recordAPICall('coincap');

    // CoinCap uses different IDs, try to match common ones
    let assetId = coinId;
    if (coinId === 'bitcoin-cash') assetId = 'bitcoin-cash';
    if (coinId === 'avalanche-2') assetId = 'avalanche';

    const interval = days === 1 ? 'h1' : 'd1';
    const now = Date.now();
    const start = now - (days * 24 * 60 * 60 * 1000);

    const response = await axios.get(`${API_PROVIDERS.coincap.baseUrl}/assets/${assetId}/history`, {
      params: {
        interval,
        start,
        end: now
      },
      timeout: 5000
    });

    return response.data.data.map(item => ({
      timestamp: item.time,
      price: parseFloat(item.priceUsd),
      date: new Date(item.time).toISOString()
    }));
  } catch (error) {
    console.error('CoinCap API error:', error.message);
    throw error;
  }
}

// Fetch historical data from Binance
async function fetchFromBinance(coinId, days) {
  try {
    if (isRateLimited('binance')) {
      throw new Error('Rate limit exceeded');
    }

    const symbol = SYMBOL_MAPPING.binance[coinId];
    if (!symbol) {
      throw new Error(`Symbol not mapped for ${coinId}`);
    }

    recordAPICall('binance');

    const interval = days === 1 ? '1h' : '1d';
    const now = Date.now();
    const startTime = now - (days * 24 * 60 * 60 * 1000);

    const response = await axios.get(`${API_PROVIDERS.binance.baseUrl}/klines`, {
      params: {
        symbol,
        interval,
        startTime,
        endTime: now,
        limit: 1000
      },
      timeout: 5000
    });

    return response.data.map(item => ({
      timestamp: item[0],
      price: parseFloat(item[4]), // Close price
      date: new Date(item[0]).toISOString()
    }));
  } catch (error) {
    console.error('Binance API error:', error.message);
    throw error;
  }
}

// Fetch historical data from CryptoCompare
async function fetchFromCryptoCompare(coinId, days) {
  try {
    if (isRateLimited('cryptocompare')) {
      throw new Error('Rate limit exceeded');
    }

    const symbol = SYMBOL_MAPPING.cryptocompare[coinId];
    if (!symbol) {
      throw new Error(`Symbol not mapped for ${coinId}`);
    }

    recordAPICall('cryptocompare');

    const endpoint = days === 1 ? 'histohour' : 'histoday';
    const limit = days === 1 ? 24 : days;

    const response = await axios.get(`${API_PROVIDERS.cryptocompare.baseUrl}/${endpoint}`, {
      params: {
        fsym: symbol,
        tsym: 'USD',
        limit
      },
      timeout: 5000
    });

    if (response.data.Response === 'Error') {
      throw new Error(response.data.Message);
    }

    return response.data.Data.map(item => ({
      timestamp: item.time * 1000,
      price: item.close,
      date: new Date(item.time * 1000).toISOString()
    }));
  } catch (error) {
    console.error('CryptoCompare API error:', error.message);
    throw error;
  }
}

// Fetch historical data from Kraken
async function fetchFromKraken(coinId, days) {
  try {
    if (isRateLimited('kraken')) {
      throw new Error('Rate limit exceeded');
    }

    const symbol = SYMBOL_MAPPING.kraken[coinId];
    if (!symbol) {
      throw new Error(`Symbol not mapped for ${coinId}`);
    }

    recordAPICall('kraken');

    const interval = days === 1 ? 60 : 1440; // minutes
    const since = Math.floor((Date.now() / 1000) - (days * 24 * 60 * 60));

    const response = await axios.get(`${API_PROVIDERS.kraken.baseUrl}/OHLC`, {
      params: {
        pair: symbol,
        interval,
        since
      },
      timeout: 5000
    });

    if (response.data.error && response.data.error.length > 0) {
      throw new Error(response.data.error[0]);
    }

    const data = response.data.result[symbol] || response.data.result[Object.keys(response.data.result)[0]];

    return data.map(item => ({
      timestamp: item[0] * 1000,
      price: parseFloat(item[4]), // Close price
      date: new Date(item[0] * 1000).toISOString()
    }));
  } catch (error) {
    console.error('Kraken API error:', error.message);
    throw error;
  }
}

// Main function to get historical prices with automatic fallback
async function getHistoricalPrices(coinId, days = 7, currency = 'usd') {
  const cacheKey = `historical_${coinId}_${days}_${currency}`;

  // Check cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    console.log(`Returning cached historical data for ${coinId}`);
    return cached;
  }

  // Try providers in order with automatic fallback
  const providers = ['coingecko', 'coincap', 'binance', 'cryptocompare', 'kraken'];

  for (const provider of providers) {
    try {
      console.log(`Attempting to fetch historical data from ${API_PROVIDERS[provider].name}...`);

      let data;
      switch (provider) {
        case 'coingecko':
          data = await fetchFromCoinGecko(coinId, days, currency);
          break;
        case 'coincap':
          data = await fetchFromCoinCap(coinId, days);
          break;
        case 'binance':
          data = await fetchFromBinance(coinId, days);
          break;
        case 'cryptocompare':
          data = await fetchFromCryptoCompare(coinId, days);
          break;
        case 'kraken':
          data = await fetchFromKraken(coinId, days);
          break;
      }

      if (data && data.length > 0) {
        console.log(`Successfully fetched ${data.length} data points from ${API_PROVIDERS[provider].name}`);

        // Cache for different durations based on time range
        const cacheTTL = days === 1 ? 300 : days === 7 ? 600 : 1800; // 5min, 10min, 30min
        await cache.set(cacheKey, data, cacheTTL);

        return data;
      }
    } catch (error) {
      console.log(`${API_PROVIDERS[provider].name} failed: ${error.message}. Trying next provider...`);
      continue;
    }
  }

  throw new Error('All API providers failed to fetch historical data');
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
  getHistoricalPrices,
  getRateLimitStatus
};
