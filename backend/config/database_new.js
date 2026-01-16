/**
 * Database Configuration with Multi-Database Support
 *
 * This module provides a unified interface for database operations
 * supporting SQLite, PostgreSQL, and MySQL.
 */

const DatabaseFactory = require('../database/DatabaseFactory');

let dbInstance = null;

/**
 * Initialize the database connection
 */
async function initializeDatabase() {
  if (!dbInstance) {
    dbInstance = await DatabaseFactory.createAndInitialize();
  }
  return dbInstance;
}

/**
 * Get the database instance
 * For backward compatibility, this returns a Proxy that converts
 * SQLite-style callbacks to the new Promise-based API
 */
function getDatabase() {
  if (!dbInstance) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }

  // Create a proxy to maintain backward compatibility with SQLite API
  return new Proxy(dbInstance, {
    get(target, prop) {
      // Handle direct property access
      if (prop in target) {
        const value = target[prop];

        // Special handling for query methods to support both callback and promise style
        if (typeof value === 'function' && ['run', 'get', 'all'].includes(prop)) {
          return function(...args) {
            // Check if last argument is a callback
            const lastArg = args[args.length - 1];
            const hasCallback = typeof lastArg === 'function';

            if (hasCallback) {
              // Callback style (for backward compatibility)
              const callback = args.pop();
              const sql = args[0];
              const params = args[1] || [];

              target[prop](sql, params)
                .then(result => {
                  if (prop === 'run') {
                    // SQLite run() callback signature: function(err) with this.lastID and this.changes
                    callback.call(result, null);
                  } else {
                    // get() and all() callback signature: function(err, rows)
                    callback(null, result);
                  }
                })
                .catch(err => callback(err));
            } else {
              // Promise style
              return value.apply(target, args);
            }
          };
        }

        return value;
      }

      return undefined;
    }
  });
}

// For backward compatibility, export an object that lazily initializes
const db = new Proxy({}, {
  get(target, prop) {
    if (prop === 'initialize') {
      return initializeDatabase;
    }

    if (!dbInstance) {
      throw new Error('Database not initialized. The database must be initialized asynchronously now. Please update your code to use async/await.');
    }

    return getDatabase()[prop];
  }
});

module.exports = db;
module.exports.initializeDatabase = initializeDatabase;
module.exports.getDatabase = getDatabase;
