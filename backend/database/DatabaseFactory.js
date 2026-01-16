/**
 * Database Factory
 * Creates the appropriate database adapter based on configuration
 */

const SQLiteDatabase = require('./SQLiteDatabase');
const PostgreSQLDatabase = require('./PostgreSQLDatabase');
const MySQLDatabase = require('./MySQLDatabase');

class DatabaseFactory {
  /**
   * Create a database instance based on DB_TYPE environment variable
   * @returns {BaseDatabase} Database instance
   */
  static create() {
    const dbType = (process.env.DB_TYPE || 'sqlite').toLowerCase();

    console.log(`Initializing database with type: ${dbType}`);

    switch (dbType) {
      case 'sqlite':
        return new SQLiteDatabase();

      case 'postgresql':
      case 'postgres':
      case 'pg':
        return new PostgreSQLDatabase();

      case 'mysql':
      case 'mariadb':
        return new MySQLDatabase();

      default:
        console.warn(`Unknown database type: ${dbType}, falling back to SQLite`);
        return new SQLiteDatabase();
    }
  }

  /**
   * Initialize and return a connected database instance
   * @returns {Promise<BaseDatabase>} Initialized database instance
   */
  static async createAndInitialize() {
    const db = DatabaseFactory.create();
    await db.initialize();
    return db;
  }
}

module.exports = DatabaseFactory;
