import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const register = (username, email, password) =>
  api.post('/auth/register', { username, email, password });

export const login = (username, password) =>
  api.post('/auth/login', { username, password });

// Crypto
export const getTopCryptos = (limit = 50, currency = 'usd') =>
  api.get('/crypto/top', { params: { limit, currency } });

export const getCryptoPrice = (coinId, currency = 'usd') =>
  api.get(`/crypto/price/${coinId}`, { params: { currency } });

export const searchCrypto = (query) =>
  api.get('/crypto/search', { params: { q: query } });

export const getHistoricalPrices = (coinId, days = 7, currency = 'usd') =>
  api.get(`/crypto/historical/${coinId}`, { params: { days, currency } });

// Currency
export const getSupportedCurrencies = () =>
  api.get('/currency/supported');

export const getExchangeRates = (baseCurrency = 'usd') =>
  api.get('/currency/rates', { params: { base: baseCurrency } });

export const getAllBalances = () =>
  api.get('/currency/balances');

export const exchangeCurrency = (fromCurrency, toCurrency, amount) =>
  api.post('/currency/exchange', { fromCurrency, toCurrency, amount });

export const depositCurrency = (currency, amount) =>
  api.post('/currency/deposit', { currency, amount });

export const setPreferredCurrency = (currency) =>
  api.post('/currency/preference', { currency });

export const getPreferredCurrency = () =>
  api.get('/currency/preference');

// Trading (updated for multi-currency)
export const getBalance = (currency = 'usd') =>
  api.get('/trading/balance', { params: { currency } });

export const topUpBalance = (amount, currency = 'usd') =>
  api.post('/trading/topup', { amount, currency });

export const buyCrypto = (coinId, symbol, name, amount, currency = 'usd') =>
  api.post('/trading/buy', { coinId, symbol, name, amount, currency });

export const sellCrypto = (coinId, symbol, amount, currency = 'usd') =>
  api.post('/trading/sell', { coinId, symbol, amount, currency });

export const getPortfolio = (currency = null) =>
  api.get('/trading/portfolio', currency ? { params: { currency } } : {});

export const getTransactionHistory = (limit = 50, offset = 0, currency = null) =>
  api.get('/trading/history', { params: { limit, offset, ...(currency && { currency }) } });

export const getStats = () =>
  api.get('/trading/stats');

export default api;
