/**
 * Database Wrapper
 * Provides a synchronous-looking interface for backward compatibility
 * while using the new async database system under the hood
 */

const DatabaseFactory = require('./DatabaseFactory');

class DatabaseWrapper {
  constructor() {
    this._db = null;
    this._initPromise = null;
    this._initialized = false;

    // Auto-initialize
    this._initPromise = this._initialize();
  }

  async _initialize() {
    try {
      this._db = await DatabaseFactory.createAndInitialize();
      this._initialized = true;
      return this._db;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  async _ensureInitialized() {
    if (!this._initialized) {
      await this._initPromise;
    }
    return this._db;
  }

  /**
   * SQLite-compatible run method
   * Supports both callback and promise styles
   */
  run(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    const promise = this._ensureInitialized().then(db => db.run(sql, params || []));

    if (callback) {
      promise
        .then(result => {
          // Create a context object with lastID and changes (SQLite style)
          const context = {
            lastID: result.lastID,
            changes: result.changes
          };
          callback.call(context, null);
        })
        .catch(err => callback(err));
    } else {
      return promise;
    }
  }

  /**
   * SQLite-compatible get method
   * Supports both callback and promise styles
   */
  get(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    const promise = this._ensureInitialized().then(db => db.get(sql, params || []));

    if (callback) {
      promise
        .then(row => callback(null, row))
        .catch(err => callback(err));
    } else {
      return promise;
    }
  }

  /**
   * SQLite-compatible all method
   * Supports both callback and promise styles
   */
  all(sql, params, callback) {
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    const promise = this._ensureInitialized().then(db => db.all(sql, params || []));

    if (callback) {
      promise
        .then(rows => callback(null, rows))
        .catch(err => callback(err));
    } else {
      return promise;
    }
  }

  /**
   * Execute a query (alias for all)
   */
  query(sql, params) {
    return this.all(sql, params);
  }

  /**
   * SQLite-compatible serialize method
   * Since we're using async/await, this just returns a promise
   */
  serialize(callback) {
    if (callback) {
      this._ensureInitialized().then(() => callback());
    } else {
      return this._ensureInitialized();
    }
  }

  /**
   * Begin a transaction
   */
  async beginTransaction() {
    const db = await this._ensureInitialized();
    return db.beginTransaction();
  }

  /**
   * Commit a transaction
   */
  async commit() {
    const db = await this._ensureInitialized();
    return db.commit();
  }

  /**
   * Rollback a transaction
   */
  async rollback() {
    const db = await this._ensureInitialized();
    return db.rollback();
  }

  /**
   * Close the database connection
   */
  async close() {
    if (this._db) {
      await this._db.close();
      this._db = null;
      this._initialized = false;
    }
  }

  /**
   * Get the underlying database instance
   */
  async getDb() {
    return this._ensureInitialized();
  }
}

// Create and export singleton instance
const dbWrapper = new DatabaseWrapper();

module.exports = dbWrapper;
