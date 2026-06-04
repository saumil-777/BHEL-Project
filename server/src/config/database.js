require('dotenv').config();
const knex = require('knex');
const path = require('path');

// Use SQLite for local development (no PostgreSQL installation needed)
// Switch to PostgreSQL by setting USE_POSTGRES=true in .env
// Use SQLite unless USE_POSTGRES is explicitly 'true'
// Setting USE_POSTGRES=false disables PostgreSQL even if DATABASE_URL is set
const usePostgres = process.env.USE_POSTGRES === 'true';

let db;

if (usePostgres) {
  db = knex({
    client: 'pg',
    connection: process.env.DATABASE_URL || {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'smimp_db',
      user: process.env.DB_USER || 'smimp_user',
      password: process.env.DB_PASS || 'smimp_pass',
    },
    pool: { min: 2, max: 10 },
    migrations: { tableName: 'knex_migrations' },
  });
} else {
  // SQLite — works without any installation, data persists in smimp.db file
  const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../../smimp.db');
  console.log('📁 Using SQLite database at:', dbPath);

  db = knex({
    client: 'better-sqlite3',
    connection: { filename: dbPath },
    useNullAsDefault: true,
    migrations: { tableName: 'knex_migrations' },
    pool: {
      afterCreate: (conn, done) => {
        // Enable WAL mode and foreign keys for better SQLite performance
        conn.pragma('journal_mode = WAL');
        conn.pragma('foreign_keys = ON');
        done(null, conn);
      },
    },
  });
}

module.exports = db;
