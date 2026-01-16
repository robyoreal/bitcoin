# Multi-Currency Feature Documentation

## Overview

The crypto paper trading app now supports multi-currency wallets and forex trading! Users can:
- Hold balances in 20+ major world currencies (USD, EUR, GBP, JPY, etc.)
- Buy/sell cryptocurrencies using any supported currency
- Exchange between fiat currencies (forex trading)
- View portfolio performance per currency
- Track transactions in multiple currencies

## Supported Currencies

### Complete List (20 currencies):
1. **USD** - US Dollar ($)
2. **EUR** - Euro (€)
3. **GBP** - British Pound (£)
4. **JPY** - Japanese Yen (¥)
5. **AUD** - Australian Dollar (A$)
6. **CAD** - Canadian Dollar (C$)
7. **CHF** - Swiss Franc (CHF)
8. **CNY** - Chinese Yuan (¥)
9. **INR** - Indian Rupee (₹)
10. **BRL** - Brazilian Real (R$)
11. **KRW** - South Korean Won (₩)
12. **MXN** - Mexican Peso (MX$)
13. **RUB** - Russian Ruble (₽)
14. **ZAR** - South African Rand (R)
15. **TRY** - Turkish Lira (₺)
16. **SGD** - Singapore Dollar (S$)
17. **HKD** - Hong Kong Dollar (HK$)
18. **NZD** - New Zealand Dollar (NZ$)
19. **SEK** - Swedish Krona (kr)
20. **NOK** - Norwegian Krone (kr)

## Backend Changes

### Database Schema Updates

#### New Tables:
1. **balances** - Multi-currency balances per user
   - `user_id` - Foreign key to users
   - `currency` - Currency code (usd, eur, etc.)
   - `amount` - Balance amount
   - Unique constraint on (user_id, currency)

#### Updated Tables:
1. **users**
   - Added `preferred_currency` field (default: 'usd')

2. **portfolio**
   - Added `currency` field to track which currency was used for purchase
   - Updated unique constraint to (user_id, symbol, currency)

3. **transactions**
   - Added `currency` field
   - Added `from_currency`, `to_currency` for exchange transactions
   - Added `exchange_rate` for forex trades
   - Added 'exchange' to transaction types

### New API Endpoints

#### Currency Management (`/api/currency/`)

**GET /api/currency/supported**
- Returns list of all supported currencies with symbols and names
- Response: `{ success: true, currencies: [...] }`

**GET /api/currency/rates?base=usd**
- Get exchange rates for all currencies relative to base currency
- Uses CoinGecko API via Bitcoin as intermediary
- Cached for 5 minutes to respect rate limits
- Response: `{ success: true, base: 'usd', rates: {...}, timestamp: ... }`

**GET /api/currency/balances**
- Get user's balances in all currencies
- Returns only currencies with non-zero balance
- Response: `{ success: true, balances: [{currency: 'usd', amount: 10000}, ...] }`

**POST /api/currency/exchange**
- Exchange between two currencies (forex trading)
- Body: `{ fromCurrency: 'usd', toCurrency: 'eur', amount: 1000 }`
- Validates balance, fetches real-time rates, executes exchange
- Logs transaction with exchange rate
- Response: `{ success: true, exchange: {...}, message: ... }`

**POST /api/currency/deposit**
- Add funds in any supported currency
- Body: `{ currency: 'eur', amount: 5000 }`
- Response: `{ success: true, currency: 'EUR', amount: 5000 }`

**POST /api/currency/preference**
- Set user's preferred display currency
- Body: `{ currency: 'eur' }`

**GET /api/currency/preference**
- Get user's preferred currency
- Response: `{ success: true, preferred_currency: 'usd' }`

#### Updated Trading Endpoints (`/api/trading/`)

**GET /api/trading/balance?currency=usd**
- Now accepts optional currency parameter
- Returns balance in specified currency

**POST /api/trading/topup**
- Now accepts currency parameter
- Body: `{ amount: 1000, currency: 'eur' }`

**POST /api/trading/buy**
- Now accepts currency parameter
- Body: `{ coinId, symbol, name, amount, currency: 'gbp' }`
- Fetches crypto price in specified currency
- Deducts from currency-specific balance
- Stores portfolio entry with currency

**POST /api/trading/sell**
- Now accepts currency parameter
- Body: `{ coinId, symbol, amount, currency: 'jpy' }`
- Sells crypto and adds proceeds to specified currency balance

**GET /api/trading/portfolio?currency=usd**
- Optional currency filter
- Returns holdings in specific currency or all currencies

**GET /api/trading/history?currency=eur&limit=50**
- Optional currency filter for transactions
- Returns transactions in specific currency or all

**GET /api/trading/stats**
- Now returns stats grouped by currency
- Response: `{ success: true, stats: { usd: {...}, eur: {...} } }`

#### Updated Crypto Endpoints (`/api/crypto/`)

**GET /api/crypto/top?limit=50&currency=eur**
- Now accepts currency parameter
- Returns crypto prices in specified currency

**GET /api/crypto/price/:coinId?currency=gbp**
- Now accepts currency parameter
- Returns price in specified currency

### New Services

**currencyService.js**
- `getSupportedCurrencies()` - List all supported currencies
- `isCurrencySupported(currency)` - Validate currency
- `getExchangeRates(baseCurrency)` - Fetch forex rates from CoinGecko
- `convertCurrency(amount, from, to)` - Convert between currencies
- `getCryptoPricesInCurrencies(coinId, currencies)` - Multi-currency crypto prices
- `formatCurrency(amount, currency)` - Format with proper symbol

**Updated cryptoAPI.js**
- `getTopCryptos(limit, currency)` - Added currency parameter
- `getCryptoPrice(coinId, currency)` - Added currency parameter
- `getCryptoPriceMultiCurrency(coinId, currencies)` - Get prices in multiple currencies

## Frontend Components

### New Components Created

#### 1. CurrencySelector (`/components/CurrencySelector.js`)
- Dropdown component for selecting currencies
- Loads all supported currencies from API
- Shows currency symbol, code, and name
- Reusable across the app

```jsx
<CurrencySelector
  value={selectedCurrency}
  onChange={setCurrency}
  label="Select Currency"
/>
```

#### 2. CurrencyExchange (`/components/CurrencyExchange.js`)
- Modal component for forex trading
- Swap button to reverse currencies
- Real-time exchange rate display
- Shows available balances
- Preview of converted amount
- Validates sufficient balance

Features:
- Live exchange rates from CoinGecko
- Swap currencies with one click
- Balance validation
- Exchange preview
- Transaction confirmation

#### 3. MultiCurrencyBalances (`/components/MultiCurrencyBalances.js`)
- Displays all user's currency balances as cards
- Shows cash, crypto value, and total per currency
- Profit/Loss indicator with color coding
- Click to filter/select currency
- Gradient card design

### Updated API Service

**frontend/src/services/api.js**
- All endpoints updated to support currency parameters
- New currency-specific endpoints added:
  - `getSupportedCurrencies()`
  - `getExchangeRates(baseCurrency)`
  - `getAllBalances()`
  - `exchangeCurrency(from, to, amount)`
  - `depositCurrency(currency, amount)`
  - `setPreferredCurrency(currency)`
  - `getPreferredCurrency()`

## How to Use Multi-Currency Features

### For Developers - Integrating into Dashboard

To add multi-currency support to the Dashboard:

```jsx
import CurrencySelector from '../components/CurrencySelector';
import CurrencyExchange from '../components/CurrencyExchange';
import MultiCurrencyBalances from '../components/MultiCurrencyBalances';
import { getAllBalances, depositCurrency } from '../services/api';

// In your component state:
const [selectedCurrency, setSelectedCurrency] = useState('usd');
const [allBalances, setAllBalances] = useState([]);
const [showExchange, setShowExchange] = useState(false);

// Load balances:
const loadBalances = async () => {
  const response = await getAllBalances();
  setAllBalances(response.data.balances);
};

// Render multi-currency balances:
<MultiCurrencyBalances
  balances={allBalances}
  stats={stats}
  onCurrencySelect={(currency) => setSelectedCurrency(currency)}
/>

// Add currency selector to trading:
<CurrencySelector
  value={selectedCurrency}
  onChange={setSelectedCurrency}
  label="Trading Currency"
/>

// Currency exchange modal:
{showExchange && (
  <CurrencyExchange
    onExchangeComplete={(result) => {
      showMessage(result.message);
      loadBalances();
      setShowExchange(false);
    }}
    onClose={() => setShowExchange(false)}
  />
)}

// Button to open exchange:
<button onClick={() => setShowExchange(true)}>
  Exchange Currencies
</button>
```

### For End Users

#### 1. View All Balances
- Multi-currency wallet cards show all your balances
- Each card displays cash and crypto holdings
- Profit/loss tracked per currency

#### 2. Deposit Currency
```
POST /api/currency/deposit
{
  "currency": "eur",
  "amount": 5000
}
```

#### 3. Exchange Currencies (Forex Trading)
- Click "Exchange Currencies" button
- Select from/to currencies
- Enter amount
- View live exchange rate
- Confirm exchange

#### 4. Buy Crypto with Any Currency
- Select your preferred currency
- Browse cryptocurrencies (prices shown in your currency)
- Buy crypto using that currency
- Holdings tracked separately per currency

#### 5. Sell Crypto to Any Currency
- Select the currency you want to receive
- Sell your crypto holdings
- Proceeds added to that currency balance

## Technical Details

### Exchange Rate Mechanism

Since CoinGecko's free tier has limitations, we use Bitcoin as an intermediary:

1. Fetch BTC price in all supported currencies
2. Calculate cross rates: `EUR/USD = BTC_EUR / BTC_USD`
3. Cache rates for 5 minutes to respect API limits
4. Use cached rates for fast conversions

### Database Migration

For existing users:
- Legacy `users.balance` field retained for backward compatibility
- New users get balance in `balances` table
- Old balance automatically considered as USD
- Portfolio entries without currency default to 'usd'

### API Rate Limiting

To avoid hitting CoinGecko's rate limits:
- Exchange rates cached for 5 minutes
- Crypto prices cached for 1 minute
- Use specific currency requests instead of fetching all
- Consider upgrading to CoinGecko Pro for production

## Testing

### Backend Tests

```bash
# Start backend
npm start

# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@test.com","password":"test123"}'

# Get supported currencies
curl http://localhost:3001/api/currency/supported \
  -H "Authorization: Bearer YOUR_TOKEN"

# Deposit EUR
curl -X POST http://localhost:3001/api/currency/deposit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currency":"eur","amount":5000}'

# View balances
curl http://localhost:3001/api/currency/balances \
  -H "Authorization: Bearer YOUR_TOKEN"

# Exchange currencies
curl -X POST http://localhost:3001/api/currency/exchange \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"fromCurrency":"usd","toCurrency":"eur","amount":1000}'
```

## Future Enhancements

1. **Historical Exchange Rates** - Track rate changes over time
2. **Currency Charts** - Visualize currency performance
3. **Auto-convert** - Automatically convert profits to preferred currency
4. **Alerts** - Price alerts for favorable exchange rates
5. **Portfolio Consolidation** - View total value in single currency
6. **Currency Allocation** - Pie chart of currency distribution
7. **Multi-currency Reports** - Export statements per currency
8. **Hedging Strategies** - Suggestions for currency diversification

## Known Limitations

1. **API Rate Limits** - Free CoinGecko tier may limit exchange rate updates
2. **Spread** - No bid/ask spread (uses mid-market rate)
3. **Fees** - No transaction fees (this is paper trading)
4. **Real-time Rates** - 5-minute cache may not reflect instant market changes
5. **Limited Pairs** - All conversions go through BTC as intermediary

## Configuration

### Environment Variables

```env
# No additional config needed for basic multi-currency support

# Optional: For production with CoinGecko Pro
COINGECKO_API_KEY=your_api_key_here
```

### Customization

To add more currencies, edit `backend/services/currencyService.js`:

```javascript
const SUPPORTED_CURRENCIES = {
  // Add your currency here
  thb: { name: 'Thai Baht', symbol: '฿', code: 'THB' },
  // ...
};
```

## Summary

The multi-currency feature transforms the app from a simple USD-based trader to a comprehensive international trading platform. Users can now:
- Trade crypto in their local currency
- Diversify across multiple fiat currencies
- Practice forex trading alongside crypto trading
- Track performance in multiple currencies simultaneously

This feature is production-ready and backward-compatible with existing data!
