/**
 * PostgreSQL Database Adapter
 */

const { Pool } = require('pg');
const BaseDatabase = require('./BaseDatabase');

class PostgreSQLDatabase extends BaseDatabase {
  constructor() {
    super();
    this.pool = null;
  }

  async initialize() {
    try {
      this.pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'crypto_trading',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });

      // Test the connection
      const client = await this.pool.connect();
      console.log('Connected to PostgreSQL database');
      client.release();

      await this.createTables();
    } catch (error) {
      console.error('Error connecting to PostgreSQL:', error.message);
      throw error;
    }
  }

  async query(sql, params = []) {
    try {
      const result = await this.pool.query(sql, params);
      return result.rows;
    } catch (error) {
      console.error('PostgreSQL query error:', error.message);
      throw error;
    }
  }

  async get(sql, params = []) {
    const rows = await this.query(sql, params);
    return rows[0] || null;
  }

  async all(sql, params = []) {
    return this.query(sql, params);
  }

  async run(sql, params = []) {
    try {
      const result = await this.pool.query(sql, params);
      return {
        lastID: result.rows[0]?.id || null,
        changes: result.rowCount || 0
      };
    } catch (error) {
      console.error('PostgreSQL run error:', error.message);
      throw error;
    }
  }

  async beginTransaction() {
    await this.pool.query('BEGIN');
  }

  async commit() {
    await this.pool.query('COMMIT');
  }

  async rollback() {
    await this.pool.query('ROLLBACK');
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('PostgreSQL database connection closed');
    }
  }

  async createUsersTable() {
    await this.run(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        balance DECIMAL(20, 2) DEFAULT 10000,
        preferred_currency VARCHAR(10) DEFAULT 'usd',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async createBalancesTable() {
    await this.run(`
      CREATE TABLE IF NOT EXISTS balances (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        currency VARCHAR(10) NOT NULL,
        amount DECIMAL(20, 2) DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, currency)
      )
    `);
  }

  async createPortfolioTable() {
    await this.run(`
      CREATE TABLE IF NOT EXISTS portfolio (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        coin_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        amount DECIMAL(20, 8) NOT NULL,
        average_buy_price DECIMAL(20, 8) NOT NULL,
        currency VARCHAR(10) DEFAULT 'usd',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(user_id, symbol, currency)
      )
    `);
  }

  async createTransactionsTable() {
    await this.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        coin_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK(type IN ('buy', 'sell', 'deposit', 'exchange')),
        amount DECIMAL(20, 8) NOT NULL,
        price DECIMAL(20, 8) NOT NULL,
        total DECIMAL(20, 2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'usd',
        from_currency VARCHAR(10),
        to_currency VARCHAR(10),
        exchange_rate DECIMAL(20, 8),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create index for faster queries
    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id)
    `).catch(() => {}); // Ignore if index already exists
  }
}

module.exports = PostgreSQLDatabase;
