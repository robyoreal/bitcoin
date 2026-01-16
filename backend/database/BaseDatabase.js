/**
 * Base Database Interface
 * Defines the common interface that all database adapters must implement
 */

class BaseDatabase {
  constructor() {
    this.db = null;
  }

  /**
   * Initialize database connection and create tables
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Execute a raw query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<any>}
   */
  async query(query, params = []) {
    throw new Error('query() must be implemented by subclass');
  }

  /**
   * Execute a query and return the first row
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<any>}
   */
  async get(query, params = []) {
    throw new Error('get() must be implemented by subclass');
  }

  /**
   * Execute a query and return all rows
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>}
   */
  async all(query, params = []) {
    throw new Error('all() must be implemented by subclass');
  }

  /**
   * Execute an insert/update/delete query
   * @param {string} query - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<{lastID: number, changes: number}>}
   */
  async run(query, params = []) {
    throw new Error('run() must be implemented by subclass');
  }

  /**
   * Begin a transaction
   * @returns {Promise<void>}
   */
  async beginTransaction() {
    throw new Error('beginTransaction() must be implemented by subclass');
  }

  /**
   * Commit a transaction
   * @returns {Promise<void>}
   */
  async commit() {
    throw new Error('commit() must be implemented by subclass');
  }

  /**
   * Rollback a transaction
   * @returns {Promise<void>}
   */
  async rollback() {
    throw new Error('rollback() must be implemented by subclass');
  }

  /**
   * Close database connection
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error('close() must be implemented by subclass');
  }

  /**
   * Create all required tables
   * This method should be overridden by subclasses if they need database-specific SQL
   * @returns {Promise<void>}
   */
  async createTables() {
    // Users table
    await this.createUsersTable();

    // Balances table (for multi-currency support)
    await this.createBalancesTable();

    // Portfolio table
    await this.createPortfolioTable();

    // Transactions table
    await this.createTransactionsTable();

    console.log('All database tables created successfully');
  }

  /**
   * Create users table - to be implemented by subclasses
   */
  async createUsersTable() {
    throw new Error('createUsersTable() must be implemented by subclass');
  }

  /**
   * Create balances table - to be implemented by subclasses
   */
  async createBalancesTable() {
    throw new Error('createBalancesTable() must be implemented by subclass');
  }

  /**
   * Create portfolio table - to be implemented by subclasses
   */
  async createPortfolioTable() {
    throw new Error('createPortfolioTable() must be implemented by subclass');
  }

  /**
   * Create transactions table - to be implemented by subclasses
   */
  async createTransactionsTable() {
    throw new Error('createTransactionsTable() must be implemented by subclass');
  }
}

module.exports = BaseDatabase;
