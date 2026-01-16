const axios = require('axios');

// Supported currencies with their details
const SUPPORTED_CURRENCIES = {
  usd: { name: 'US Dollar', symbol: '$', code: 'USD' },
  eur: { name: 'Euro', symbol: '€', code: 'EUR' },
  gbp: { name: 'British Pound', symbol: '£', code: 'GBP' },
  jpy: { name: 'Japanese Yen', symbol: '¥', code: 'JPY' },
  aud: { name: 'Australian Dollar', symbol: 'A$', code: 'AUD' },
  cad: { name: 'Canadian Dollar', symbol: 'C$', code: 'CAD' },
  chf: { name: 'Swiss Franc', symbol: 'CHF', code: 'CHF' },
  cny: { name: 'Chinese Yuan', symbol: '¥', code: 'CNY' },
  inr: { name: 'Indian Rupee', symbol: '₹', code: 'INR' },
  brl: { name: 'Brazilian Real', symbol: 'R$', code: 'BRL' },
  krw: { name: 'South Korean Won', symbol: '₩', code: 'KRW' },
  mxn: { name: 'Mexican Peso', symbol: 'MX$', code: 'MXN' },
  rub: { name: 'Russian Ruble', symbol: '₽', code: 'RUB' },
  zar: { name: 'South African Rand', symbol: 'R', code: 'ZAR' },
  try: { name: 'Turkish Lira', symbol: '₺', code: 'TRY' },
  sgd: { name: 'Singapore Dollar', symbol: 'S$', code: 'SGD' },
  hkd: { name: 'Hong Kong Dollar', symbol: 'HK$', code: 'HKD' },
  nzd: { name: 'New Zealand Dollar', symbol: 'NZ$', code: 'NZD' },
  sek: { name: 'Swedish Krona', symbol: 'kr', code: 'SEK' },
  nok: { name: 'Norwegian Krone', symbol: 'kr', code: 'NOK' }
};

// Cache for exchange rates
const exchangeRateCache = new Map();
const CACHE_DURATION = 300000; // 5 minutes

/**
 * Get list of all supported currencies
 */
function getSupportedCurrencies() {
  return Object.keys(SUPPORTED_CURRENCIES).map(key => ({
    id: key,
    ...SUPPORTED_CURRENCIES[key]
  }));
}

/**
 * Check if currency is supported
 */
function isCurrencySupported(currency) {
  return SUPPORTED_CURRENCIES.hasOwnProperty(currency.toLowerCase());
}

/**
 * Get exchange rates for all supported currencies
 * Uses CoinGecko API which provides forex rates via Bitcoin as intermediary
 */
async function getExchangeRates(baseCurrency = 'usd') {
  const cacheKey = `rates_${baseCurrency}`;
  const cached = exchangeRateCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    // Use CoinGecko's simple/price endpoint with multiple currencies
    // We'll use BTC as intermediary to get forex rates
    const currencies = Object.keys(SUPPORTED_CURRENCIES).join(',');
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: 'bitcoin',
        vs_currencies: currencies
      }
    });

    const btcPrices = response.data.bitcoin;
    const baseRate = btcPrices[baseCurrency.toLowerCase()];

    // Calculate exchange rates relative to base currency
    const rates = {};
    for (const [currency, btcPrice] of Object.entries(btcPrices)) {
      rates[currency] = btcPrice / baseRate;
    }

    const data = {
      base: baseCurrency,
      rates: rates,
      timestamp: new Date().toISOString()
    };

    exchangeRateCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  } catch (error) {
    console.error('Error fetching exchange rates:', error.message);
    throw new Error('Failed to fetch exchange rates');
  }
}

/**
 * Convert amount from one currency to another
 */
async function convertCurrency(amount, fromCurrency, toCurrency) {
  if (fromCurrency.toLowerCase() === toCurrency.toLowerCase()) {
    return {
      amount: amount,
      fromCurrency,
      toCurrency,
      rate: 1
    };
  }

  if (!isCurrencySupported(fromCurrency) || !isCurrencySupported(toCurrency)) {
    throw new Error('Currency not supported');
  }

  const rates = await getExchangeRates(fromCurrency);
  const rate = rates.rates[toCurrency.toLowerCase()];

  if (!rate) {
    throw new Error('Exchange rate not available');
  }

  return {
    amount: amount * rate,
    fromCurrency,
    toCurrency,
    rate: rate
  };
}

/**
 * Get crypto prices in multiple currencies
 */
async function getCryptoPricesInCurrencies(coinId, currencies) {
  try {
    const currencyList = Array.isArray(currencies)
      ? currencies.join(',')
      : currencies;

    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
      params: {
        ids: coinId,
        vs_currencies: currencyList,
        include_24hr_change: true
      }
    });

    return response.data[coinId];
  } catch (error) {
    console.error('Error fetching crypto prices in currencies:', error.message);
    throw new Error('Failed to fetch crypto prices');
  }
}

/**
 * Format currency amount with proper symbol
 */
function formatCurrency(amount, currency) {
  const currencyInfo = SUPPORTED_CURRENCIES[currency.toLowerCase()];
  if (!currencyInfo) {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }

  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return `${currencyInfo.symbol}${formattedAmount}`;
}

module.exports = {
  SUPPORTED_CURRENCIES,
  getSupportedCurrencies,
  isCurrencySupported,
  getExchangeRates,
  convertCurrency,
  getCryptoPricesInCurrencies,
  formatCurrency
};
