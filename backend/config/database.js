/**
 * Database Configuration
 * Multi-Database Support: SQLite, PostgreSQL, MySQL
 *
 * This module provides backward-compatible database access
 * while supporting multiple database types through environment configuration.
 *
 * Set DB_TYPE in .env to: sqlite, postgresql, or mysql
 */

const DatabaseWrapper = require('../database/DatabaseWrapper');

// Export the database wrapper instance
// This maintains compatibility with existing code that uses:
// db.run(), db.get(), db.all(), db.serialize()
module.exports = DatabaseWrapper;
