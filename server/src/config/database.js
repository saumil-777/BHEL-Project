require('dotenv').config();
const knex = require('knex');
const path = require('path');

const usePostgres = process.env.USE_POSTGRES === 'true';

let db;

if (usePostgres) {
  console.log('Using PostgreSQL database');

  db = knex({
    client: 'pg',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
    },
  });
} else {
  const dbPath =
    process.env.SQLITE_PATH || path.join(__dirname, '../../smimp.db');

  console.log('Using SQLite database at:', dbPath);

  db = knex({
    client: 'better-sqlite3',
    connection: {
      filename: dbPath,
    },
    useNullAsDefault: true,
    migrations: {
      tableName: 'knex_migrations',
    },
    pool: {
      afterCreate: (conn, done) => {
        conn.pragma('journal_mode = WAL');
        conn.pragma('foreign_keys = ON');
        done(null, conn);
      },
    },
  });
}

module.exports = db;