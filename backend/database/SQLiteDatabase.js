/**
 * SQLite Database Adapter
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const BaseDatabase = require('./BaseDatabase');

class SQLiteDatabase extends BaseDatabase {
  constructor() {
    super();
    this.dbPath = process.env.DB_PATH || path.join(__dirname, '../../crypto_trading.db');
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, async (err) => {
        if (err) {
          console.error('Error opening SQLite database:', err.message);
          reject(err);
        } else {
          console.log('Connected to SQLite database at:', this.dbPath);
          try {
            await this.createTables();
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }

  async query(sql, params = []) {
    return this.all(sql, params);
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async beginTransaction() {
    await this.run('BEGIN TRANSACTION');
  }

  async commit() {
    await this.run('COMMIT');
  }

  async rollback() {
    await this.run('ROLLBACK');
  }

  async close() {
    return new Promise((resolve, reject) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) reject(err);
          else {
            console.log('SQLite database connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  async createUsersTable() {
    await this.run(`
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
  }

  async createBalancesTable() {
    await this.run(`
      CREATE TABLE IF NOT EXISTS balances (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        currency TEXT NOT NULL,
        amount REAL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, currency)
      )
    `);
  }

  async createPortfolioTable() {
    await this.run(`
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
  }

  async createTransactionsTable() {
    await this.run(`
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
  }
}

module.exports = SQLiteDatabase;
