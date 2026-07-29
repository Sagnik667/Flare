import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const sslOption = { rejectUnauthorized: false };

function getPoolConfig() {
  let dbUrl = process.env.DATABASE_URL;

  if (dbUrl) {
    // Ensure sslmode=require is present in the connection string for Neon & hosted Postgres
    if (!dbUrl.includes('sslmode=')) {
      dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'sslmode=require';
    } else if (dbUrl.includes('sslmode=verify-full')) {
      dbUrl = dbUrl.replace('sslmode=verify-full', 'sslmode=require');
    }
    return {
      connectionString: dbUrl,
      ssl: sslOption,
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'flare_db',
    user: process.env.DB_USER || 'flare_user',
    password: process.env.DB_PASSWORD,
    ssl: (process.env.DB_SSL || 'false') === 'true' || process.env.NODE_ENV === 'production'
      ? sslOption
      : false,
  };
}

const pool = new Pool({
  ...getPoolConfig(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 15000,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const query = (text, params) => {
  return pool.query(text, params);
};

export const getClient = () => {
  return pool.connect();
};

export default {
  query,
  getClient,
  pool,
};
