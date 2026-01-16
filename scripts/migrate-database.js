#!/usr/bin/env node

/**
 * Database Migration Script
 *
 * Migrates data from SQLite to PostgreSQL or MySQL
 *
 * Usage:
 *   node scripts/migrate-database.js --from sqlite --to postgresql
 *   node scripts/migrate-database.js --from sqlite --to mysql
 */

require('dotenv').config();
const path = require('path');

const SQLiteDatabase = require('../backend/database/SQLiteDatabase');
const PostgreSQLDatabase = require('../backend/database/PostgreSQLDatabase');
const MySQLDatabase = require('../backend/database/MySQLDatabase');

// Parse command line arguments
const args = process.argv.slice(2);
const fromIndex = args.indexOf('--from');
const toIndex = args.indexOf('--to');

if (fromIndex === -1 || toIndex === -1) {
  console.error('Usage: node migrate-database.js --from <source_db> --to <target_db>');
  console.error('Example: node migrate-database.js --from sqlite --to postgresql');
  process.exit(1);
}

const fromDb = args[fromIndex + 1];
const toDb = args[toIndex + 1];

async function createDatabaseInstance(dbType) {
  let db;

  switch (dbType.toLowerCase()) {
    case 'sqlite':
      db = new SQLiteDatabase();
      break;
    case 'postgresql':
    case 'postgres':
      db = new PostgreSQLDatabase();
      break;
    case 'mysql':
      db = new MySQLDatabase();
      break;
    default:
      throw new Error(`Unknown database type: ${dbType}`);
  }

  await db.initialize();
  return db;
}

async function migrateTables(sourceDb, targetDb) {
  console.log('\n📋 Starting data migration...\n');

  const tables = ['users', 'balances', 'portfolio', 'transactions'];

  for (const table of tables) {
    console.log(`📦 Migrating table: ${table}`);

    try {
      // Fetch all data from source
      const rows = await sourceDb.all(`SELECT * FROM ${table}`);
      console.log(`   Found ${rows.length} rows`);

      if (rows.length === 0) {
        console.log(`   ✓ ${table} (empty)\n`);
        continue;
      }

      // Get column names from first row
      const columns = Object.keys(rows[0]);

      // Build parameterized insert query
      const placeholders = columns.map((_, i) => `?`).join(', ');
      const columnNames = columns.join(', ');
      const insertQuery = `INSERT INTO ${table} (${columnNames}) VALUES (${placeholders})`;

      // Insert rows one by one
      let inserted = 0;
      for (const row of rows) {
        const values = columns.map(col => row[col]);

        try {
          await targetDb.run(insertQuery, values);
          inserted++;
        } catch (error) {
          // Handle duplicate key errors (row might already exist)
          if (error.message.includes('UNIQUE') || error.message.includes('duplicate')) {
            console.log(`   ⚠ Skipping duplicate row in ${table}`);
          } else {
            throw error;
          }
        }
      }

      console.log(`   ✓ ${table} (${inserted} rows inserted)\n`);
    } catch (error) {
      console.error(`   ✗ Error migrating ${table}:`, error.message);
      throw error;
    }
  }
}

async function migrate() {
  console.log('🚀 Database Migration Tool\n');
  console.log(`Source: ${fromDb}`);
  console.log(`Target: ${toDb}\n`);

  if (fromDb === toDb) {
    console.error('❌ Source and target databases must be different');
    process.exit(1);
  }

  let sourceDb, targetDb;

  try {
    // Initialize source database
    console.log('📡 Connecting to source database...');
    sourceDb = await createDatabaseInstance(fromDb);
    console.log('✓ Source database connected\n');

    // Initialize target database
    console.log('📡 Connecting to target database...');
    targetDb = await createDatabaseInstance(toDb);
    console.log('✓ Target database connected\n');

    // Migrate data
    await migrateTables(sourceDb, targetDb);

    console.log('✅ Migration completed successfully!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close connections
    if (sourceDb) {
      await sourceDb.close();
    }
    if (targetDb) {
      await targetDb.close();
    }
  }
}

// Run migration
migrate();
