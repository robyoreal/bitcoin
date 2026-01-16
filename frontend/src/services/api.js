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
export const getTopCryptos = (limit = 50) =>
  api.get('/crypto/top', { params: { limit } });

export const getCryptoPrice = (coinId) =>
  api.get(`/crypto/price/${coinId}`);

export const searchCrypto = (query) =>
  api.get('/crypto/search', { params: { q: query } });

// Trading
export const getBalance = () =>
  api.get('/trading/balance');

export const topUpBalance = (amount) =>
  api.post('/trading/topup', { amount });

export const buyCrypto = (coinId, symbol, name, amount) =>
  api.post('/trading/buy', { coinId, symbol, name, amount });

export const sellCrypto = (coinId, symbol, amount) =>
  api.post('/trading/sell', { coinId, symbol, amount });

export const getPortfolio = () =>
  api.get('/trading/portfolio');

export const getTransactionHistory = (limit = 50, offset = 0) =>
  api.get('/trading/history', { params: { limit, offset } });

export const getStats = () =>
  api.get('/trading/stats');

export default api;
