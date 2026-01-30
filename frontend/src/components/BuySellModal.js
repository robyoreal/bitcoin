import React, { useState, useEffect } from 'react';
import CurrencySelector from './CurrencySelector';
import { buyCrypto, sellCrypto, getAllBalances, getPortfolio, getCryptoPrice } from '../services/api';
import './BuySellModal.css';

function BuySellModal({ crypto, onTradeComplete, onClose }) {
  const [mode, setMode] = useState(crypto?.initialMode || 'buy'); // 'buy' or 'sell'
  const [currency, setCurrency] = useState('usd');
  const [amount, setAmount] = useState('');
  const [balances, setBalances] = useState({});
  const [holdings, setHoldings] = useState(null);
  const [cryptoPrice, setCryptoPrice] = useState(crypto?.current_price || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Reload price when currency changes
    loadCryptoPrice();
  }, [currency, crypto?.id]);

  const loadData = async () => {
    try {
      const [balancesRes, portfolioRes] = await Promise.all([
        getAllBalances(),
        getPortfolio()
      ]);

      // Map balances
      const balanceMap = {};
      if (balancesRes.data.balances) {
        balancesRes.data.balances.forEach(b => {
          balanceMap[b.currency.toLowerCase()] = b.amount;
        });
      }
      setBalances(balanceMap);

      // Find holdings for this crypto
      if (portfolioRes.data.portfolio) {
        const holding = portfolioRes.data.portfolio.find(
          p => p.coin_id === crypto?.id || p.symbol.toLowerCase() === crypto?.symbol.toLowerCase()
        );
        setHoldings(holding || null);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadCryptoPrice = async () => {
    if (!crypto?.id) return;
    try {
      const response = await getCryptoPrice(crypto.id, currency);
      if (response.data.price) {
        setCryptoPrice(response.data.price);
      }
    } catch (error) {
      console.error('Error loading crypto price:', error);
    }
  };

  const handleTrade = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const tradeAmount = parseFloat(amount);

    if (mode === 'sell') {
      const maxSell = holdings?.amount || 0;
      if (tradeAmount > maxSell) {
        setError(`Insufficient holdings. Max: ${maxSell.toFixed(8)} ${crypto.symbol.toUpperCase()}`);
        return;
      }
    } else {
      const totalCost = tradeAmount * cryptoPrice;
      const availableBalance = balances[currency.toLowerCase()] || 0;
      if (totalCost > availableBalance) {
        setError(`Insufficient ${currency.toUpperCase()} balance`);
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      let response;
      if (mode === 'buy') {
        response = await buyCrypto(
          crypto.id,
          crypto.symbol,
          crypto.name,
          tradeAmount,
          currency
        );
      } else {
        response = await sellCrypto(
          crypto.id,
          crypto.symbol,
          tradeAmount,
          currency
        );
      }

      if (onTradeComplete) {
        onTradeComplete(response.data);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || `${mode === 'buy' ? 'Buy' : 'Sell'} failed`);
    } finally {
      setLoading(false);
    }
  };

  const handleMaxSell = () => {
    if (holdings?.amount) {
      setAmount(holdings.amount.toString());
    }
  };

  const getCurrencySymbol = (curr) => {
    const symbols = {
      usd: '$',
      eur: '€',
      gbp: '£',
      jpy: '¥',
      aud: 'A$',
      cad: 'C$',
      chf: 'CHF',
      cny: '¥',
      inr: '₹',
      sgd: 'S$'
    };
    return symbols[curr.toLowerCase()] || curr.toUpperCase();
  };

  const totalCost = amount ? parseFloat(amount) * cryptoPrice : 0;
  const availableBalance = balances[currency.toLowerCase()] || 0;
  const maxBuyAmount = cryptoPrice > 0 ? availableBalance / cryptoPrice : 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content buysell-modal">
        <div className="modal-header">
          <h2>
            {mode === 'buy' ? 'Buy' : 'Sell'} {crypto?.name}
          </h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="crypto-info">
          {crypto?.image && (
            <img src={crypto.image} alt={crypto.name} className="crypto-icon" />
          )}
          <div className="crypto-details">
            <span className="crypto-name-display">{crypto?.name}</span>
            <span className="crypto-symbol">{crypto?.symbol?.toUpperCase()}</span>
          </div>
          <div className="crypto-price">
            {getCurrencySymbol(currency)}{cryptoPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
          </div>
        </div>

        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === 'buy' ? 'active buy' : ''}`}
            onClick={() => { setMode('buy'); setAmount(''); setError(''); }}
          >
            Buy
          </button>
          <button
            className={`mode-btn ${mode === 'sell' ? 'active sell' : ''}`}
            onClick={() => { setMode('sell'); setAmount(''); setError(''); }}
          >
            Sell
          </button>
        </div>

        <div className="modal-form">
          <div className="form-field">
            <label>{mode === 'buy' ? 'Pay with' : 'Receive in'}</label>
            <CurrencySelector
              value={currency}
              onChange={setCurrency}
              label=""
            />
            <div className="balance-info">
              Available: {getCurrencySymbol(currency)}{availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="form-field">
            <div className="amount-label-row">
              <label>Amount ({crypto?.symbol?.toUpperCase()})</label>
              {mode === 'sell' && holdings?.amount > 0 && (
                <button className="max-btn" onClick={handleMaxSell}>
                  MAX
                </button>
              )}
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`Enter ${crypto?.symbol?.toUpperCase()} amount`}
              className="input-field"
              step="0.00000001"
            />
            {mode === 'buy' && (
              <div className="balance-info">
                Max you can buy: ~{maxBuyAmount.toFixed(8)} {crypto?.symbol?.toUpperCase()}
              </div>
            )}
            {mode === 'sell' && (
              <div className="balance-info holdings-info">
                Your holdings: {(holdings?.amount || 0).toFixed(8)} {crypto?.symbol?.toUpperCase()}
              </div>
            )}
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div className={`trade-preview ${mode}`}>
              <div className="preview-row">
                <span>Price per {crypto?.symbol?.toUpperCase()}:</span>
                <strong>{getCurrencySymbol(currency)}{cryptoPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}</strong>
              </div>
              <div className="preview-row">
                <span>{mode === 'buy' ? 'Total Cost:' : 'You will receive:'}</span>
                <strong className="highlight">
                  {getCurrencySymbol(currency)}{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button
              onClick={handleTrade}
              className={`btn-primary ${mode}`}
              disabled={loading || !amount || parseFloat(amount) <= 0}
            >
              {loading ? 'Processing...' : `${mode === 'buy' ? 'Buy' : 'Sell'} ${crypto?.symbol?.toUpperCase()}`}
            </button>
            <button onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BuySellModal;
