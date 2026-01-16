const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../../crypto_trading.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

function initDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        balance REAL DEFAULT 10000,
        preferred_currency TEXT DEFAULT 'usd',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Multi-currency balances table
    db.run(`
      CREATE TABLE IF NOT EXISTS balances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        currency TEXT NOT NULL,
        amount REAL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, currency)
      )
    `);

    // Portfolio table - stores current crypto holdings
    db.run(`
      CREATE TABLE IF NOT EXISTS portfolio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        coin_id TEXT NOT NULL,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        average_buy_price REAL NOT NULL,
        currency TEXT DEFAULT 'usd',
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, symbol, currency)
      )
    `);

    // Transactions table - stores all buy/sell history
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        symbol TEXT NOT NULL,
        coin_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('buy', 'sell', 'deposit', 'exchange')),
        amount REAL NOT NULL,
        price REAL NOT NULL,
        total REAL NOT NULL,
        currency TEXT DEFAULT 'usd',
        from_currency TEXT,
        to_currency TEXT,
        exchange_rate REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    console.log('Database tables initialized');
  });
}

module.exports = db;
