import React, { useState, useEffect } from 'react';
import {
  getTopCryptos,
  getPortfolio,
  getStats,
  getTransactionHistory,
  buyCrypto,
  sellCrypto,
  topUpBalance,
  getCryptoPrice,
} from '../services/api';
import './Dashboard.css';

function Dashboard({ onLogout }) {
  const [user, setUser] = useState(null);
  const [cryptos, setCryptos] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('market');
  const [selectedCrypto, setSelectedCrypto] = useState(null);
  const [tradeAmount, setTradeAmount] = useState('');
  const [topUpAmount, setTopUpAmount] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cryptosRes, portfolioRes, statsRes, historyRes] = await Promise.all([
        getTopCryptos(50),
        getPortfolio(),
        getStats(),
        getTransactionHistory(20),
      ]);

      setCryptos(cryptosRes.data.data);
      setPortfolio(portfolioRes.data.portfolio);
      setStats(statsRes.data.stats);
      setTransactions(historyRes.data.transactions);
    } catch (error) {
      console.error('Error loading data:', error);
      showMessage('Error loading data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(''), 3000);
  };

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount <= 0) {
      showMessage('Please enter a valid amount', 'error');
      return;
    }

    try {
      const response = await topUpBalance(amount);
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
        amount
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
      const response = await sellCrypto(holding.coin_id, holding.symbol, amount);
      showMessage(response.data.message);
      loadData();
    } catch (error) {
      showMessage(error.response?.data?.error || 'Failed to sell', 'error');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
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

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Cash Balance</h3>
          <p className="stat-value">{formatCurrency(stats?.cash_balance || 0)}</p>
        </div>
        <div className="stat-card">
          <h3>Crypto Value</h3>
          <p className="stat-value">{formatCurrency(stats?.crypto_value || 0)}</p>
        </div>
        <div className="stat-card">
          <h3>Total Value</h3>
          <p className="stat-value">{formatCurrency(stats?.total_value || 0)}</p>
        </div>
        <div className="stat-card">
          <h3>Profit/Loss</h3>
          <p className={`stat-value ${(stats?.profit_loss || 0) >= 0 ? 'positive' : 'negative'}`}>
            {formatCurrency(stats?.profit_loss || 0)}
            {stats?.profit_loss_percent !== undefined && (
              <span className="percentage"> ({stats.profit_loss_percent.toFixed(2)}%)</span>
            )}
          </p>
        </div>
      </div>

      <div className="top-up-section">
        <input
          type="number"
          placeholder="Amount to add"
          value={topUpAmount}
          onChange={(e) => setTopUpAmount(e.target.value)}
          className="input-field"
        />
        <button onClick={handleTopUp} className="btn-primary">
          Top Up Balance
        </button>
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
            {selectedCrypto && (
              <div className="trade-panel">
                <h3>Buy {selectedCrypto.name} ({selectedCrypto.symbol})</h3>
                <p>Current Price: {formatCurrency(selectedCrypto.current_price)}</p>
                <div className="trade-form">
                  <input
                    type="number"
                    placeholder="Amount"
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
                    Total: {formatCurrency(parseFloat(tradeAmount) * selectedCrypto.current_price)}
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
                    <td>{formatCurrency(crypto.current_price)}</td>
                    <td className={crypto.price_change_24h >= 0 ? 'positive' : 'negative'}>
                      {crypto.price_change_24h?.toFixed(2)}%
                    </td>
                    <td>{formatCurrency(crypto.market_cap)}</td>
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
                    <th>Current Value</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map((holding) => (
                    <tr key={holding.id}>
                      <td>
                        <div className="crypto-name">
                          <span>{holding.name}</span>
                          <span className="symbol">{holding.symbol}</span>
                        </div>
                      </td>
                      <td>{holding.amount.toFixed(8)}</td>
                      <td>{formatCurrency(holding.average_buy_price)}</td>
                      <td>{formatCurrency(holding.amount * holding.average_buy_price)}</td>
                      <td>
                        <button
                          onClick={() => handleSell(holding)}
                          className="btn-small btn-danger"
                        >
                          Sell
                        </button>
                      </td>
                    </tr>
                  ))}
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
                      <td>{formatCurrency(tx.price)}</td>
                      <td>{formatCurrency(tx.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
