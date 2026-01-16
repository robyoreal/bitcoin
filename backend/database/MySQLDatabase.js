/**
 * MySQL Database Adapter
 */

const mysql = require('mysql2/promise');
const BaseDatabase = require('./BaseDatabase');

class MySQLDatabase extends BaseDatabase {
  constructor() {
    super();
    this.pool = null;
  }

  async initialize() {
    try {
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        database: process.env.DB_NAME || 'crypto_trading',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });

      // Test the connection
      const connection = await this.pool.getConnection();
      console.log('Connected to MySQL database');
      connection.release();

      await this.createTables();
    } catch (error) {
      console.error('Error connecting to MySQL:', error.message);
      throw error;
    }
  }

  async query(sql, params = []) {
    try {
      const [rows] = await this.pool.execute(sql, params);
      return rows;
    } catch (error) {
      console.error('MySQL query error:', error.message);
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
      const [result] = await this.pool.execute(sql, params);
      return {
        lastID: result.insertId || null,
        changes: result.affectedRows || 0
      };
    } catch (error) {
      console.error('MySQL run error:', error.message);
      throw error;
    }
  }

  async beginTransaction() {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();
    this.transactionConnection = connection;
  }

  async commit() {
    if (this.transactionConnection) {
      await this.transactionConnection.commit();
      this.transactionConnection.release();
      this.transactionConnection = null;
    }
  }

  async rollback() {
    if (this.transactionConnection) {
      await this.transactionConnection.rollback();
      this.transactionConnection.release();
      this.transactionConnection = null;
    }
  }

  async close() {
    if (this.pool) {
      await this.pool.end();
      console.log('MySQL database connection closed');
    }
  }

  async createUsersTable() {
    await this.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        balance DECIMAL(20, 2) DEFAULT 10000,
        preferred_currency VARCHAR(10) DEFAULT 'usd',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async createBalancesTable() {
    await this.run(`
      CREATE TABLE IF NOT EXISTS balances (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        currency VARCHAR(10) NOT NULL,
        amount DECIMAL(20, 2) DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_currency (user_id, currency)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async createPortfolioTable() {
    await this.run(`
      CREATE TABLE IF NOT EXISTS portfolio (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        symbol VARCHAR(20) NOT NULL,
        coin_id VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        amount DECIMAL(20, 8) NOT NULL,
        average_buy_price DECIMAL(20, 8) NOT NULL,
        currency VARCHAR(10) DEFAULT 'usd',
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_symbol_currency (user_id, symbol, currency)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  async createTransactionsTable() {
    await this.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
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
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }
}

module.exports = MySQLDatabase;
