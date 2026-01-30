import React, { useState, useEffect } from 'react';
import CurrencySelector from './CurrencySelector';
import { topUpBalance, getAllBalances } from '../services/api';
import './TopUpModal.css';

const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000];

function TopUpModal({ onTopUpComplete, onClose }) {
  const [currency, setCurrency] = useState('usd');
  const [amount, setAmount] = useState('');
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadBalances();
  }, []);

  const loadBalances = async () => {
    try {
      const response = await getAllBalances();
      const balanceMap = {};
      if (response.data.balances) {
        response.data.balances.forEach(b => {
          balanceMap[b.currency.toLowerCase()] = b.amount;
        });
      }
      setBalances(balanceMap);
    } catch (error) {
      console.error('Error loading balances:', error);
    }
  };

  const handleTopUp = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await topUpBalance(parseFloat(amount), currency);
      if (onTopUpComplete) {
        onTopUpComplete(response.data);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Top up failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAmount = (quickAmount) => {
    setAmount(quickAmount.toString());
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

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Top Up Balance</h2>
          <button onClick={onClose} className="close-btn">&times;</button>
        </div>

        <div className="modal-form">
          <div className="form-field">
            <label>Currency</label>
            <CurrencySelector
              value={currency}
              onChange={setCurrency}
              label=""
            />
            <div className="balance-info">
              Current Balance: {getCurrencySymbol(currency)}{(balances[currency.toLowerCase()] || 0).toFixed(2)}
            </div>
          </div>

          <div className="form-field">
            <label>Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="input-field"
              step="0.01"
            />
          </div>

          <div className="quick-amounts">
            <label>Quick Select</label>
            <div className="quick-amount-buttons">
              {QUICK_AMOUNTS.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => handleQuickAmount(quickAmount)}
                  className={`quick-amount-btn ${amount === quickAmount.toString() ? 'active' : ''}`}
                >
                  {getCurrencySymbol(currency)}{quickAmount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          {amount && parseFloat(amount) > 0 && (
            <div className="topup-preview">
              <div className="preview-row">
                <span>You will add:</span>
                <strong className="highlight">
                  {getCurrencySymbol(currency)}{parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
              <div className="preview-row">
                <span>New Balance:</span>
                <strong>
                  {getCurrencySymbol(currency)}{((balances[currency.toLowerCase()] || 0) + parseFloat(amount)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </strong>
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="modal-actions">
            <button
              onClick={handleTopUp}
              className="btn-primary"
              disabled={loading || !amount || parseFloat(amount) <= 0}
            >
              {loading ? 'Processing...' : 'Top Up Now'}
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

export default TopUpModal;
