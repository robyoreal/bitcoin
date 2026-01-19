/**
 * Currency Service
 * Manages supported currencies for the trading platform
 */

// List of supported currencies
// These must match CoinGecko's supported currencies
const SUPPORTED_CURRENCIES = [
  'usd',  // US Dollar
  'eur',  // Euro
  'gbp',  // British Pound
  'jpy',  // Japanese Yen
  'aud',  // Australian Dollar
  'cad',  // Canadian Dollar
  'chf',  // Swiss Franc
  'cny',  // Chinese Yuan
  'krw',  // South Korean Won
  'idr',  // Indonesian Rupiah
  'inr',  // Indian Rupee
  'brl',  // Brazilian Real
  'rub',  // Russian Ruble
  'sgd',  // Singapore Dollar
  'hkd',  // Hong Kong Dollar
  'myr',  // Malaysian Ringgit
  'thb',  // Thai Baht
  'php',  // Philippine Peso
  'vnd',  // Vietnamese Dong
];

// Currency symbols and display names
const CURRENCY_INFO = {
  usd: { symbol: '$', name: 'US Dollar', decimals: 2 },
  eur: { symbol: '€', name: 'Euro', decimals: 2 },
  gbp: { symbol: '£', name: 'British Pound', decimals: 2 },
  jpy: { symbol: '¥', name: 'Japanese Yen', decimals: 0 },
  aud: { symbol: 'A$', name: 'Australian Dollar', decimals: 2 },
  cad: { symbol: 'C$', name: 'Canadian Dollar', decimals: 2 },
  chf: { symbol: 'Fr', name: 'Swiss Franc', decimals: 2 },
  cny: { symbol: '¥', name: 'Chinese Yuan', decimals: 2 },
  krw: { symbol: '₩', name: 'South Korean Won', decimals: 0 },
  idr: { symbol: 'Rp', name: 'Indonesian Rupiah', decimals: 0 },
  inr: { symbol: '₹', name: 'Indian Rupee', decimals: 2 },
  brl: { symbol: 'R$', name: 'Brazilian Real', decimals: 2 },
  rub: { symbol: '₽', name: 'Russian Ruble', decimals: 2 },
  sgd: { symbol: 'S$', name: 'Singapore Dollar', decimals: 2 },
  hkd: { symbol: 'HK$', name: 'Hong Kong Dollar', decimals: 2 },
  myr: { symbol: 'RM', name: 'Malaysian Ringgit', decimals: 2 },
  thb: { symbol: '฿', name: 'Thai Baht', decimals: 2 },
  php: { symbol: '₱', name: 'Philippine Peso', decimals: 2 },
  vnd: { symbol: '₫', name: 'Vietnamese Dong', decimals: 0 },
};

/**
 * Check if a currency is supported
 * @param {string} currency - Currency code (e.g., 'usd', 'idr')
 * @returns {boolean}
 */
function isCurrencySupported(currency) {
  return SUPPORTED_CURRENCIES.includes(currency.toLowerCase());
}

/**
 * Get all supported currencies
 * @returns {Array} Array of currency codes
 */
function getSupportedCurrencies() {
  return [...SUPPORTED_CURRENCIES];
}

/**
 * Get currency information
 * @param {string} currency - Currency code
 * @returns {object|null} Currency info or null if not supported
 */
function getCurrencyInfo(currency) {
  const currencyLower = currency.toLowerCase();
  return CURRENCY_INFO[currencyLower] || null;
}

/**
 * Format amount with currency symbol
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code
 * @returns {string} Formatted amount with symbol
 */
function formatCurrency(amount, currency) {
  const currencyLower = currency.toLowerCase();
  const info = CURRENCY_INFO[currencyLower];
  
  if (!info) {
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
  
  const formattedAmount = amount.toFixed(info.decimals);
  return `${info.symbol}${formattedAmount}`;
}

module.exports = {
  isCurrencySupported,
  getSupportedCurrencies,
  getCurrencyInfo,
  formatCurrency,
  SUPPORTED_CURRENCIES,
  CURRENCY_INFO
};
