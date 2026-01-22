// Currency symbols mapping
export const CURRENCY_SYMBOLS = {
  usd: '$',
  eur: '€',
  gbp: '£',
  jpy: '¥',
  aud: 'A$',
  cad: 'C$',
  chf: 'CHF',
  cny: '¥',
  inr: '₹',
  brl: 'R$',
  krw: '₩',
  mxn: 'MX$',
  rub: '₽',
  zar: 'R',
  try: '₺',
  sgd: 'S$',
  hkd: 'HK$',
  nzd: 'NZ$',
  sek: 'kr',
  nok: 'kr',
  idr: 'Rp'  // Indonesian Rupiah
};

// Currency locale mappings for proper thousand separators
export const CURRENCY_LOCALES = {
  usd: 'en-US',
  eur: 'de-DE',
  gbp: 'en-GB',
  jpy: 'ja-JP',
  aud: 'en-AU',
  cad: 'en-CA',
  chf: 'de-CH',
  cny: 'zh-CN',
  inr: 'en-IN',
  brl: 'pt-BR',
  krw: 'ko-KR',
  mxn: 'es-MX',
  rub: 'ru-RU',
  zar: 'en-ZA',
  try: 'tr-TR',
  sgd: 'en-SG',
  hkd: 'zh-HK',
  nzd: 'en-NZ',
  sek: 'sv-SE',
  nok: 'nb-NO',
  idr: 'id-ID'  // Indonesian locale for proper formatting
};

// Currencies that don't need decimal places (integer currencies)
const INTEGER_CURRENCIES = ['jpy', 'krw', 'idr'];

/**
 * Format currency with proper symbol and thousand separators
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (e.g., 'usd', 'idr', 'eur')
 * @param {boolean} showSymbol - Whether to show currency symbol (default: true)
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currency = 'usd', showSymbol = true) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showSymbol ? `${CURRENCY_SYMBOLS[currency] || ''}0` : '0';
  }

  const currencyLower = currency.toLowerCase();
  const locale = CURRENCY_LOCALES[currencyLower] || 'en-US';
  const symbol = CURRENCY_SYMBOLS[currencyLower] || '';

  // Check if this is an integer currency (no decimals)
  const decimals = INTEGER_CURRENCIES.includes(currencyLower) ? 0 : 2;

  try {
    // Format number with proper locale settings
    const formattedNumber = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: true  // Ensures thousand separators
    }).format(amount);

    // Return with or without symbol
    if (showSymbol && symbol) {
      // For currencies like IDR, add a space after symbol for readability
      const needsSpace = ['Rp', 'CHF'].includes(symbol);
      return `${symbol}${needsSpace ? ' ' : ''}${formattedNumber}`;
    }

    return formattedNumber;
  } catch (error) {
    console.error('Error formatting currency:', error);
    return showSymbol ? `${symbol}${amount.toFixed(decimals)}` : amount.toFixed(decimals);
  }
}

/**
 * Format percentage with sign
 * @param {number} percentage - The percentage value
 * @param {number} decimals - Number of decimal places (default: 2)
 * @returns {string} Formatted percentage string with + or - sign
 */
export function formatPercentage(percentage, decimals = 2) {
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return '0.00%';
  }

  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(decimals)}%`;
}
