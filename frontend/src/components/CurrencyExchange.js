import React, { useState, useEffect, useCallback } from 'react';
import CurrencySelector from './CurrencySelector';
import { exchangeCurrency, getExchangeRates, getAllBalances } from '../services/api';
import './CurrencyExchange.css';

function CurrencyExchange({ onExchangeComplete, onClose }) {
  const [fromCurrency, setFromCurrency] = useState('usd');
  const [toCurrency, setToCurrency] = useState('eur');
  const [amount, setAmount] = useState('');
  const [exchangeRate, setExchangeRate] = useState(null);
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadBalances = useCallback(async () => {
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
  }, []);

  const loadExchangeRate = useCallback(async () => {
    try {
      const response = await getExchangeRates(fromCurrency);
      console.log('Exchange rate response:', response.data);
      setExchangeRate(response.data);
    } catch (error) {
      console.error('Error loading exchange rate:', error);
      setError('Failed to load exchange rates');
    }
  }, [fromCurrency]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  useEffect(() => {
    if (fromCurrency && toCurrency) {
      loadExchangeRate();
    }
  }, [fromCurrency, toCurrency, loadExchangeRate]);

  useEffect(() => {
    if (exchangeRate && amount) {
      // Get the rate for target currency
      const rate = exchangeRate.rates[toCurrency.toLowerCase()];
      if (rate) {
        setConvertedAmount(parseFloat(amount) * rate);
      } else {
        console.error('Rate not found for:', toCurrency);
        setConvertedAmount(0);
      }
    } else {
      setConvertedAmount(0);
    }
  }, [amount, exchangeRate, toCurrency]);

  const handleExchange = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    const availableBalance = balances[fromCurrency.toLowerCase()] || 0;
    if (parseFloat(amount) > availableBalance) {
      setError(`Insufficient ${fromCurrency.toUpperCase()} balance`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await exchangeCurrency(fromCurrency, toCurrency, parseFloat(amount));
      if (onExchangeComplete) {
        onExchangeComplete(response.data);
      }
      setAmount('');
      await loadBalances();
    } catch (err) {
      setError(err.response?.data?.error || 'Exchange failed');
    } finally {
      setLoading(false);
    }
  };

  const swapCurrencies = () => {
    const temp = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(temp);
  };

  const getRate = () => {
    if (!exchangeRate || !exchangeRate.rates) return null;
    return exchangeRate.rates[toCurrency.toLowerCase()];
  };

  return (
    <div className="currency-exchange-modal">
      <div className="exchange-content">
        <div className="exchange-header">
          <h2>Currency Exchange (Forex)</h2>
          {onClose && <button onClick={onClose} className="close-btn">&times;</button>}
        </div>

        <div className="exchange-form">
          <div className="exchange-row">
            <div className="exchange-field">
              <label>From</label>
              <CurrencySelector
                value={fromCurrency}
                onChange={setFromCurrency}
                label=""
              />
              <div className="balance-info">
                Available: {(balances[fromCurrency.toLowerCase()] || 0).toFixed(2)} {fromCurrency.toUpperCase()}
              </div>
            </div>

            <button className="swap-btn" onClick={swapCurrencies}>
              ⇄
            </button>

            <div className="exchange-field">
              <label>To</label>
              <CurrencySelector
                value={toCurrency}
                onChange={setToCurrency}
                label=""
              />
              <div className="balance-info">
                Balance: {(balances[toCurrency.toLowerCase()] || 0).toFixed(2)} {toCurrency.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="amount-input">
            <label>Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="input-field"
              step="0.01"
            />
          </div>

          {exchangeRate && amount > 0 && getRate() && (
            <div className="exchange-preview">
              <div className="rate-info">
                <span>Exchange Rate:</span>
                <strong>1 {fromCurrency.toUpperCase()} = {getRate()?.toFixed(6)} {toCurrency.toUpperCase()}</strong>
              </div>
              <div className="converted-amount">
                <span>You will receive:</span>
                <strong className="highlight">{convertedAmount.toFixed(2)} {toCurrency.toUpperCase()}</strong>
              </div>
            </div>
          )}

          {error && <div className="error-message">{error}</div>}

          <div className="exchange-actions">
            <button
              onClick={handleExchange}
              className="btn-primary"
              disabled={loading || !amount || parseFloat(amount) <= 0}
            >
              {loading ? 'Exchanging...' : 'Exchange Now'}
            </button>
            {onClose && (
              <button onClick={onClose} className="btn-secondary">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CurrencyExchange;