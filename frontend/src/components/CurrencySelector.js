import React, { useState, useEffect } from 'react';
import { getSupportedCurrencies } from '../services/api';
import './CurrencySelector.css';

function CurrencySelector({ value, onChange, label = "Currency" }) {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrencies();
  }, []);

  const loadCurrencies = async () => {
    try {
      const response = await getSupportedCurrencies();
      setCurrencies(response.data.currencies);
    } catch (error) {
      console.error('Error loading currencies:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <select disabled><option>Loading...</option></select>;
  }

  return (
    <div className="currency-selector">
      {label && <label>{label}:</label>}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="currency-select">
        {currencies.map((currency) => (
          <option key={currency.id} value={currency.id}>
            {currency.symbol} {currency.code} - {currency.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default CurrencySelector;
