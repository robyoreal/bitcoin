import React, { useState, useEffect, useCallback } from 'react';
import {
  getTopCryptos,
  getPortfolio,
  getStats,
  getTransactionHistory,
  getAllBalances,
  getExchangeRates,
} from '../services/api';
import MultiCurrencyBalances from '../components/MultiCurrencyBalances';
import CurrencyExchange from '../components/CurrencyExchange';
import TopUpModal from '../components/TopUpModal';
import BuySellModal from '../components/BuySellModal';
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
  const [showExchangeModal, setShowExchangeModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showBuySellModal, setShowBuySellModal] = useState(false);
  const [message, setMessage] = useState('');
  const [exchangeRates, setExchangeRates] = useState(null);
 
  const showMessage = useCallback((msg, type = 'success') => {
    setMessage({ text: msg, type });
    setTimeout(() => setMessage(''), 3000);
  }, []);
 
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [cryptosRes, portfolioRes, statsRes, historyRes, balancesRes, ratesRes] = await Promise.all([
        getTopCryptos(50),
        getPortfolio(),
        getStats(),
        getTransactionHistory(20),
        getAllBalances(),
        getExchangeRates('usd'),
      ]);
 
      setCryptos(cryptosRes.data.data);
      setPortfolio(portfolioRes.data.portfolio);
      setStats(statsRes.data.stats);
      setTransactions(historyRes.data.transactions);
      setBalances(balancesRes.data.balances || []);
      setExchangeRates(ratesRes.data);
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
 
  const openBuySellModal = (crypto, mode = 'buy') => {
    setSelectedCrypto({ ...crypto, initialMode: mode });
    setShowBuySellModal(true);
  };
 
  const handleSellFromPortfolio = (holding) => {
    // Convert holding to crypto format for the modal
    const crypto = {
      id: holding.coin_id,
      name: holding.name,
      symbol: holding.symbol,
      current_price: holding.average_buy_price,
      initialMode: 'sell'
    };
    setSelectedCrypto(crypto);
    setShowBuySellModal(true);
  };
 
  const formatCurrency = (value, currency = 'usd') => {
    return formatCurrencyUtil(value, currency);
  };
 
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };
 
  // Get current price for a crypto in a specific currency
  const getCurrentPrice = (coinId, currency = 'usd') => {
    const crypto = cryptos.find(c => c.id === coinId);
    if (!crypto) return null;
 
    const usdPrice = crypto.current_price;
    const targetCurrency = currency.toLowerCase();
 
    // If requesting USD price, return directly
    if (targetCurrency === 'usd') {
      return usdPrice;
    }
 
    // Convert USD price to target currency using exchange rates
    if (exchangeRates && exchangeRates.rates) {
      const rate = exchangeRates.rates[targetCurrency];
      if (rate) {
        return usdPrice * rate;
      }
    }
 
    // If exchange rate not available, return null
    return null;
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
        <button
          onClick={() => setShowTopUpModal(true)}
          className="btn-primary btn-action"
        >
          💰 Top Up Balance
        </button>
        <button
          onClick={() => setShowExchangeModal(true)}
          className="btn-primary btn-action"
        >
          💱 Currency Exchange
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
            <PriceGraph cryptos={cryptos} initialCoinId="bitcoin" />
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
                        onClick={() => openBuySellModal(crypto)}
                        className="btn-small btn-primary"
                      >
                        Buy/Sell
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
                    const holdingCurrency = holding.currency || 'usd';
                    const currentPrice = getCurrentPrice(holding.coin_id, holdingCurrency);
                    const priceChange = calculatePriceChange(holding.average_buy_price, currentPrice);
                    const currentValue = currentPrice ? holding.amount * currentPrice : holding.amount * holding.average_buy_price;
 
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
                            onClick={() => handleSellFromPortfolio(holding)}
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
 
      {showTopUpModal && (
        <TopUpModal
          onTopUpComplete={(data) => {
            showMessage(data.message || 'Balance topped up successfully!');
            loadData();
          }}
          onClose={() => setShowTopUpModal(false)}
        />
      )}
 
      {showBuySellModal && selectedCrypto && (
        <BuySellModal
          crypto={selectedCrypto}
          onTradeComplete={(data) => {
            showMessage(data.message || 'Trade completed successfully!');
            loadData();
          }}
          onClose={() => {
            setShowBuySellModal(false);
            setSelectedCrypto(null);
          }}
        />
      )}
    </div>
  );
}
 
export default Dashboard;