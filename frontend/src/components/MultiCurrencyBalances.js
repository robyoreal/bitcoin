import React from 'react';
import './MultiCurrencyBalances.css';

const CURRENCY_SYMBOLS = {
  usd: '$', eur: '€', gbp: '£', jpy: '¥', aud: 'A$', cad: 'C$',
  chf: 'CHF', cny: '¥', inr: '₹', brl: 'R$', krw: '₩', mxn: 'MX$',
  rub: '₽', zar: 'R', try: '₺', sgd: 'S$', hkd: 'HK$', nzd: 'NZ$',
  sek: 'kr', nok: 'kr'
};

function MultiCurrencyBalances({ balances, stats, onCurrencySelect }) {
  const formatCurrency = (amount, currency) => {
    const symbol = CURRENCY_SYMBOLS[currency.toLowerCase()] || '';
    return `${symbol}${amount.toFixed(2)}`;
  };

  if (!balances || balances.length === 0) {
    return (
      <div className="multi-currency-balances">
        <h3>Your Balances</h3>
        <p className="empty-message">No balances yet</p>
      </div>
    );
  }

  return (
    <div className="multi-currency-balances">
      <h3>Your Multi-Currency Wallets</h3>
      <div className="balance-grid">
        {balances.map((balance) => {
          const currencyStats = stats?.[balance.currency] || {};
          const totalValue = currencyStats.total_value || balance.amount;
          const profitLoss = currencyStats.profit_loss || 0;

          return (
            <div
              key={balance.currency}
              className="balance-card"
              onClick={() => onCurrencySelect && onCurrencySelect(balance.currency)}
            >
              <div className="balance-header">
                <span className="currency-code">{balance.currency.toUpperCase()}</span>
                <span className={`profit-indicator ${profitLoss >= 0 ? 'positive' : 'negative'}`}>
                  {profitLoss >= 0 ? '↑' : '↓'}
                </span>
              </div>
              <div className="balance-amount">
                {formatCurrency(balance.amount, balance.currency)}
              </div>
              <div className="balance-details">
                <div className="detail-row">
                  <span>Cash:</span>
                  <span>{formatCurrency(currencyStats.cash_balance || balance.amount, balance.currency)}</span>
                </div>
                {currencyStats.crypto_value > 0 && (
                  <>
                    <div className="detail-row">
                      <span>Crypto:</span>
                      <span>{formatCurrency(currencyStats.crypto_value, balance.currency)}</span>
                    </div>
                    <div className="detail-row">
                      <span>Total:</span>
                      <strong>{formatCurrency(totalValue, balance.currency)}</strong>
                    </div>
                    <div className={`detail-row profit-loss ${profitLoss >= 0 ? 'positive' : 'negative'}`}>
                      <span>P/L:</span>
                      <strong>
                        {formatCurrency(Math.abs(profitLoss), balance.currency)}
                        {profitLoss !== 0 && ` (${currencyStats.profit_loss_percent?.toFixed(2)}%)`}
                      </strong>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MultiCurrencyBalances;
