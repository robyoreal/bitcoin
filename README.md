# Crypto Paper Trading App

A lightweight web application for practicing cryptocurrency trading without financial risk. Built with Node.js, Express, React, and SQLite.

## Features

- **User Management**: Register/login with JWT authentication
- **Real-time Crypto Prices**: Live price data from CoinGecko API for 50+ cryptocurrencies
- **Paper Trading**: Buy and sell crypto with virtual money
- **Portfolio Management**: Track your holdings and performance
- **Transaction History**: View all your trading activity
- **Balance Top-up**: Add virtual funds to your account
- **Statistics Dashboard**: Monitor your profit/loss and portfolio value

## Tech Stack

### Backend
- **Node.js** + **Express**: REST API server
- **SQLite**: Lightweight database
- **JWT**: Secure authentication
- **bcryptjs**: Password hashing
- **Axios**: HTTP client for CoinGecko API

### Frontend
- **React**: UI framework
- **React Router**: Navigation
- **Axios**: API requests
- **CSS3**: Responsive styling

### External APIs
- **CoinGecko API**: Free crypto price data (no API key required)

## Project Structure

```
crypto-paper-trading/
├── backend/
│   ├── config/
│   │   └── database.js          # SQLite configuration
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── models/                   # (Database schemas defined in config)
│   ├── routes/
│   │   ├── auth.js              # Register/Login endpoints
│   │   ├── crypto.js            # Crypto price endpoints
│   │   └── trading.js           # Trading/Portfolio endpoints
│   ├── services/
│   │   ├── auth.js              # JWT/Password utilities
│   │   └── cryptoAPI.js         # CoinGecko API service
│   └── server.js                # Main Express server
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── Login.js         # Login/Register page
│   │   │   ├── Login.css
│   │   │   ├── Dashboard.js     # Main trading interface
│   │   │   └── Dashboard.css
│   │   ├── services/
│   │   │   └── api.js           # API client
│   │   ├── App.js               # Main React component
│   │   ├── App.css
│   │   └── index.js
│   └── package.json
├── .env                         # Environment variables
├── .gitignore
├── package.json                 # Backend dependencies
└── README.md

```

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Step 1: Clone the Repository
```bash
git clone <repository-url>
cd bitcoin
```

### Step 2: Install Backend Dependencies
```bash
npm install
```

### Step 3: Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

### Step 4: Configure Environment Variables
The `.env` file is already created with default values:
```env
PORT=3001
JWT_SECRET=crypto_paper_trading_secret_key_2024
INITIAL_BALANCE=10000
DB_PATH=./crypto_trading.db
```

You can modify these values as needed.

### Step 5: Start the Backend Server
```bash
npm start
```

The backend will run on `http://localhost:3001`

### Step 6: Start the Frontend (in a new terminal)
```bash
cd frontend
npm start
```

The frontend will run on `http://localhost:3000` and automatically open in your browser.

## Quick Start Guide

### 1. Register a New Account
- Open `http://localhost:3000`
- Click "Register"
- Enter username, email, and password
- You'll receive $10,000 virtual balance to start trading

### 2. Browse Cryptocurrencies
- View the top 50 cryptocurrencies by market cap
- See real-time prices and 24h price changes
- Click "Buy" on any cryptocurrency

### 3. Make Your First Trade
- Select a cryptocurrency
- Enter the amount you want to buy
- Click "Buy" to execute the trade
- Your balance will be deducted and crypto added to portfolio

### 4. Manage Your Portfolio
- Switch to "Portfolio" tab to see your holdings
- View your average buy price and current value
- Click "Sell" to sell any cryptocurrency

### 5. Top Up Balance
- Use the top-up section to add more virtual funds
- Enter amount and click "Top Up Balance"

### 6. View Transaction History
- Switch to "History" tab
- See all your buy/sell transactions
- Track your trading activity

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Crypto Data
- `GET /api/crypto/top` - Get top cryptocurrencies
- `GET /api/crypto/price/:coinId` - Get specific crypto price
- `GET /api/crypto/search` - Search cryptocurrencies

### Trading
- `GET /api/trading/balance` - Get user balance
- `POST /api/trading/topup` - Top up balance
- `POST /api/trading/buy` - Buy cryptocurrency
- `POST /api/trading/sell` - Sell cryptocurrency
- `GET /api/trading/portfolio` - Get user's portfolio
- `GET /api/trading/history` - Get transaction history
- `GET /api/trading/stats` - Get portfolio statistics

## Database Schema

### Users Table
- `id`: Primary key
- `username`: Unique username
- `email`: Unique email
- `password`: Hashed password
- `balance`: Current cash balance
- `created_at`: Registration timestamp

### Portfolio Table
- `id`: Primary key
- `user_id`: Foreign key to users
- `symbol`: Crypto symbol (BTC, ETH, etc.)
- `coin_id`: CoinGecko coin ID
- `name`: Cryptocurrency name
- `amount`: Amount held
- `average_buy_price`: Average purchase price

### Transactions Table
- `id`: Primary key
- `user_id`: Foreign key to users
- `symbol`: Crypto symbol
- `coin_id`: CoinGecko coin ID
- `name`: Cryptocurrency name
- `type`: Transaction type (buy/sell/deposit)
- `amount`: Amount traded
- `price`: Price at time of trade
- `total`: Total transaction value
- `created_at`: Transaction timestamp

## Features in Detail

### User Management
- Secure registration with password hashing (bcrypt)
- JWT-based authentication
- Each user starts with $10,000 virtual balance
- Session persistence using localStorage

### Real-time Pricing
- Live prices from CoinGecko API
- 1-minute price caching to respect rate limits
- Support for 10,000+ cryptocurrencies
- 24-hour price change tracking

### Paper Trading
- Buy cryptocurrencies with virtual money
- Sell holdings for virtual profit/loss
- Portfolio automatically updates average buy prices
- Real-time profit/loss calculation

### Portfolio Analytics
- Total portfolio value (cash + crypto)
- Profit/loss tracking (absolute and percentage)
- Individual holding performance
- Transaction history with timestamps

## Development Scripts

### Backend
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
```

### Frontend
```bash
cd frontend
npm start          # Start development server
npm run build      # Build for production
```

### Run Both Concurrently
```bash
npm run dev:all    # Run both backend and frontend
```

## Configuration

### Change Initial Balance
Edit `.env`:
```env
INITIAL_BALANCE=50000  # Give users $50,000 instead of $10,000
```

### Change Server Port
Edit `.env`:
```env
PORT=5000  # Run backend on port 5000
```

### Use Different Database
Edit `.env`:
```env
DB_PATH=/path/to/custom/database.db
```

## Rate Limits

CoinGecko free tier limits:
- 10-50 calls per minute
- No API key required for basic usage
- Price caching (60 seconds) helps stay within limits

## Security Features

- Password hashing with bcrypt (10 salt rounds)
- JWT tokens with 7-day expiration
- SQL injection prevention (parameterized queries)
- CORS enabled for frontend-backend communication
- Bearer token authentication for protected routes

## Troubleshooting

### Backend won't start
- Check if port 3001 is already in use
- Verify Node.js is installed: `node --version`
- Delete `node_modules` and run `npm install` again

### Frontend won't start
- Check if port 3000 is already in use
- Verify React dependencies: `cd frontend && npm install`
- Clear browser cache and restart

### Database errors
- Delete `crypto_trading.db` to reset database
- Restart backend server to recreate tables

### API errors
- Check internet connection (CoinGecko API requires internet)
- Wait a minute if you hit rate limits
- Check browser console for detailed error messages

## Future Enhancements

Potential features to add:
- Price alerts and notifications
- Historical price charts
- Advanced order types (limit orders, stop-loss)
- Leaderboard for top traders
- Social features (follow other traders)
- Mobile app version
- More detailed analytics
- Import/export portfolio data

## License

MIT

## Contributing

Feel free to submit issues and pull requests!

## Support

For issues or questions, please open a GitHub issue.

---

**Happy Paper Trading!** 📈💰
