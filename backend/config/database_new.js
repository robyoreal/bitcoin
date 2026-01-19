/**
 * Database Configuration - MySQL Version
 * Simplified version that works directly with mysql2
 */

const mysql = require('mysql2/promise');

// Database configuration from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'crypto_trading',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

let isInitialized = false;

/**
 * Initialize database and create tables
 */
async function initializeDatabase() {
  if (isInitialized) {
    return;
  }

  try {
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database');
    
    // Create users table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        balance DECIMAL(20, 2) DEFAULT 10000.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create portfolio table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS portfolio (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        coin_id VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        amount DECIMAL(20, 8) NOT NULL,
        average_buy_price DECIMAL(20, 8) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_coin (user_id, coin_id)
      )
    `);
    
    // Create transactions table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        symbol VARCHAR(50) NOT NULL,
        coin_id VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(20, 8) NOT NULL,
        price DECIMAL(20, 8) NOT NULL,
        total DECIMAL(20, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    
    connection.release();
    console.log('Database tables initialized successfully');
    isInitialized = true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

/**
 * Execute a query and return all rows
 * Compatible with SQLite's db.all() callback style
 */
function all(sql, params, callback) {
  // Support both callback and promise style
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }

  const promise = pool.execute(sql, params)
    .then(([rows]) => rows)
    .catch(error => {
      console.error('Database query error:', error);
      throw error;
    });

  if (callback) {
    promise
      .then(rows => callback(null, rows))
      .catch(err => callback(err));
  } else {
    return promise;
  }
}

/**
 * Execute a query and return a single row
 * Compatible with SQLite's db.get() callback style
 */
function get(sql, params, callback) {
  // Support both callback and promise style
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }

  const promise = pool.execute(sql, params)
    .then(([rows]) => rows[0] || null)
    .catch(error => {
      console.error('Database get error:', error);
      throw error;
    });

  if (callback) {
    promise
      .then(row => callback(null, row))
      .catch(err => callback(err));
  } else {
    return promise;
  }
}

/**
 * Execute an INSERT/UPDATE/DELETE query
 * Compatible with SQLite's db.run() callback style
 */
function run(sql, params, callback) {
  // Support both callback and promise style
  if (typeof params === 'function') {
    callback = params;
    params = [];
  }

  const promise = pool.execute(sql, params)
    .then(([result]) => {
      // Return object compatible with SQLite's this.lastID and this.changes
      return {
        lastID: result.insertId,
        changes: result.affectedRows,
        insertId: result.insertId,
        affectedRows: result.affectedRows
      };
    })
    .catch(error => {
      console.error('Database run error:', error);
      throw error;
    });

  if (callback) {
    promise
      .then(result => {
        // Call callback with 'this' context containing lastID and changes
        callback.call(result, null);
      })
      .catch(err => callback(err));
  } else {
    return promise;
  }
}

// Create a database object that mimics SQLite's db object
const db = {
  all,
  get,
  run,
  initialize: initializeDatabase,
  pool
};

module.exports = db;
module.exports.initializeDatabase = initializeDatabase;