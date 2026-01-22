import React, { useState, useEffect, useCallback } from 'react';
import {
  getTopCryptos,
  getPortfolio,
  getStats,
  getTransactionHistory,
  buyCrypto,
  sellCrypto,
  topUpBalance,
  getAllBalances,
} from '../services/api';
import CurrencySelector from '../components/CurrencySelector';
import MultiCurrencyBalances from '../components/MultiCurrencyBalances';
import CurrencyExchange from '../components/CurrencyExchange';
import PriceGraph from '../components/PriceGraph';
import { formatCurrency as formatCurrencyUtil, formatPercentage } from '../utils/currencyFormatter';
import './Dashboard.css';

function Dashboard({ onLogout }) {
  const [user, setUser] = useState(null);
  const [cryptos, setCryptos] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('market');
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [tradeAmount, setTradeAmount] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [topUpCurrency, setTopUpCurrency] = useState('usd');
  const [tradeCurrency, setTradeCurrency] = useState('usd');
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [message, setMessage] = useState('');

  const showMessage = useCallback((msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(''), 3000);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cryptosRes, portfolioRes, statsRes, historyRes, balancesRes] = await Promise.all([
        getTopCryptos(50),
        getPortfolio(),
        getStats(),
        getTransactionHistory(20),
        getAllBalances(),
      ]);

      setCryptos(cryptosRes.data.data);
      setPortfolio(portfolioRes.data.portfolio);
      setStats(statsRes.data.stats);
      setTransactions(historyRes.data.transactions);
      setBalances(balancesRes.data.balances || []);
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showMessage]);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    loadData();
  }, [loadData]);

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0) {
      showMessage('Please enter a valid amount', 'error');
      return;
    }

    try {
      const response = await topUpBalance(amount, topUpCurrency);
      showMessage(response.data.message);
      setTopUpAmount('');
      loadData();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to top up', 'error');
    }
  };

  const handleBuy = async () => {
    if (!selectedCrypto || !tradeAmount) {
      showMessage('Please select crypto and enter amount', 'error');
      return;
    }

    const amount = parseFloat(tradeAmount);
    if (amount <= 0) {
      showMessage('Please enter a valid amount', 'error');
      return;
    }

    try {
      const response = await buyCrypto(
        selectedCrypto.id,
        selectedCrypto.symbol,
        selectedCrypto.name,
        amount,
        tradeCurrency
      );
      showMessage(response.data.message);
      setTradeAmount('');
      setSelectedCrypto(null);
      loadData();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to buy', 'error');
    }
  };

  const handleSell = async (holding) => {
    const amount = parseFloat(prompt(`How much ${holding.symbol} do you want to sell? (Max: ${holding.amount})`));

    if (!amount || amount <= 0) {
      showMessage('Invalid amount', 'error');
      return;
    }

    if (amount > holding.amount) {
      showMessage('Insufficient holdings', 'error');
      return;
    }

    try {
      const response = await sellCrypto(holding.coin_id, holding.symbol, amount, holding.currency || 'usd');
      showMessage(response.data.message);
      loadData();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to sell', 'error');
    }
  };

  const formatCurrency = (value, currency = 'usd') => {
    return formatCurrencyUtil(value, currency);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Get current price for a crypto from the market data
  const getCurrentPrice = (coinId) => {
    const crypto = cryptos.find(c => c.id === coinId);
    return crypto ? crypto.current_price : null;
  };

  // Calculate percentage change between two prices
  const calculatePriceChange = (buyPrice, currentPrice) => {
    if (!currentPrice || !buyPrice || buyPrice === 0) return 0;
    return ((currentPrice - buyPrice) / buyPrice) * 100;
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Crypto Paper Trading</h1>
        <div className="user-info">
          <span>Welcome, {user?.username}</span>
          <button onClick={onLogout} className="btn-secondary">Logout</button>
        </div>
      </header>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <MultiCurrencyBalances balances={balances} stats={stats} />

      <div className="actions-section">
        <div className="top-up-section-wrapper">
          <h3 className="section-title">Top Up Balance</h3>
          <div className="top-up-controls">
            <div className="form-group">
              <CurrencySelector value={topUpCurrency} onChange={setTopUpCurrency} label="Currency" />
            </div>
            <div className="form-group">
              <label className="form-label">Amount to add:</label>
              <input
                type="number"
                placeholder="Enter amount"
                value={topUpAmount}
                onChange={(e) => setTopUpAmount(e.target.value)}
                className="input-field"
              />
            </div>
            <button onClick={handleTopUp} className="btn-primary btn-topup">
              Top Up
            </button>
          </div>
        </div>

        <div className="exchange-section-wrapper">
          <button
            onClick={() => setShowExchangeModal(true)}
            className="btn-primary btn-exchange"
          >
            💱 Currency Exchange (Forex)
          </button>
        </div>
      </div>

      <div className="tabs">
        <button
          className={activeTab === 'market' ? 'active' : ''}
          onClick={() => setActiveTab('market')}
        >
          Market
        </button>
        <button
          className={activeTab === 'portfolio' ? 'active' : ''}
          onClick={() => setActiveTab('portfolio')}
        >
          Portfolio
        </button>
        <button
          className={activeTab === 'history' ? 'active' : ''}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'market' && (
          <div className="market-section">
            <h2>Top Cryptocurrencies</h2>
            <PriceGraph cryptos={cryptos} initialCoinId="bitcoin" />
            {selectedCrypto && (
              <div className="trade-panel">
                <h3>Buy {selectedCrypto.name} ({selectedCrypto.symbol})</h3>
                <p>Current Price: {formatCurrency(selectedCrypto.current_price, selectedCrypto.currency || 'usd')}</p>
                <div className="trade-form">
                  <CurrencySelector
                    value={tradeCurrency}
                    onChange={setTradeCurrency}
                    label="Pay with"
                  />
                  <input
                    type="number"
                    placeholder="Amount of crypto"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    className="input-field"
                    step="0.00000001"
                  />
                  <button onClick={handleBuy} className="btn-primary">
                    Buy
                  </button>
                  <button onClick={() => setSelectedCrypto(null)} className="btn-secondary">
                    Cancel
                  </button>
                </div>
                {tradeAmount && (
                  <p className="trade-total">
                    Total: {formatCurrency(parseFloat(tradeAmount) * selectedCrypto.current_price, tradeCurrency)}
                  </p>
                )}
              </div>
            )}
            <table className="crypto-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Price</th>
                  <th>24h Change</th>
                  <th>Market Cap</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cryptos.map((crypto, index) => (
                  <tr key={crypto.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="crypto-name">
                        <img src={crypto.image} alt={crypto.name} width="24" height="24" />
                        <span>{crypto.name}</span>
                        <span className="symbol">{crypto.symbol}</span>
                      </div>
                    </td>
                    <td>{formatCurrency(crypto.current_price, crypto.currency || 'usd')}</td>
                    <td className={crypto.price_change_24h >= 0 ? 'positive' : 'negative'}>
                      {formatPercentage(crypto.price_change_24h || 0)}
                    </td>
                    <td>{formatCurrency(crypto.market_cap, crypto.currency || 'usd')}</td>
                    <td>
                      <button
                        onClick={() => setSelectedCrypto(crypto)}
                        className="btn-small btn-primary"
                      >
                        Buy
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="portfolio-section">
            <h2>Your Portfolio</h2>
            {portfolio.length === 0 ? (
              <p className="empty-message">You don't have any crypto holdings yet. Start trading!</p>
            ) : (
              <table className="crypto-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Amount</th>
                    <th>Avg Buy Price</th>
                    <th>Current Price</th>
                    <th>Current Value</th>
                    <th>Changes</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map((holding) => {
                    const currentPrice = getCurrentPrice(holding.coin_id);
                    const priceChange = calculatePriceChange(holding.average_buy_price, currentPrice);
                    const currentValue = currentPrice ? holding.amount * currentPrice : holding.amount * holding.average_buy_price;
                    const holdingCurrency = holding.currency || 'usd';

                    return (
                      <tr key={holding.id}>
                        <td>
                          <div className="crypto-name">
                            <span>{holding.name}</span>
                            <span className="symbol">{holding.symbol}</span>
                          </div>
                        </td>
                        <td>{holding.amount.toFixed(8)}</td>
                        <td>{formatCurrency(holding.average_buy_price, holdingCurrency)}</td>
                        <td>
                          {currentPrice
                            ? formatCurrency(currentPrice, holdingCurrency)
                            : <span className="text-muted">N/A</span>
                          }
                        </td>
                        <td>{formatCurrency(currentValue, holdingCurrency)}</td>
                        <td className={currentPrice && priceChange !== 0 ? (priceChange >= 0 ? 'positive' : 'negative') : ''}>
                          {currentPrice
                            ? formatPercentage(priceChange)
                            : <span className="text-muted">N/A</span>
                          }
                        </td>
                        <td>
                          <button
                            onClick={() => handleSell(holding)}
                            className="btn-small btn-danger"
                          >
                            Sell
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-section">
            <h2>Transaction History</h2>
            {transactions.length === 0 ? (
              <p className="empty-message">No transactions yet</p>
            ) : (
              <table className="crypto-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Crypto</th>
                    <th>Amount</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{formatDate(tx.created_at)}</td>
                      <td>
                        <span className={`badge badge-${tx.type}`}>
                          {tx.type.toUpperCase()}
                        </span>
                      </td>
                      <td>{tx.symbol}</td>
                      <td>{tx.amount.toFixed(8)}</td>
                      <td>{formatCurrency(tx.price, tx.currency || 'usd')}</td>
                      <td>{formatCurrency(tx.total, tx.currency || 'usd')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {showExchangeModal && (
        <CurrencyExchange
          onExchangeComplete={(data) => {
            showMessage(data.message || 'Currency exchanged successfully!');
            loadData();
          }}
          onClose={() => setShowExchangeModal(false)}
        />
      )}
    </div>
  );
}

export default Dashboard;
