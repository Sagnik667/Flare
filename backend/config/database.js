import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const getPoolConfig = () => {
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    try {
      const parsed = new URL(dbUrl);
      return {
        host: parsed.hostname,
        port: parseInt(parsed.port || '5432', 10),
        database: parsed.pathname.slice(1),
        user: parsed.username,
        password: decodeURIComponent(parsed.password),
        ssl: { rejectUnauthorized: false },
      };
    } catch (err) {
      return {
        connectionString: dbUrl,
        ssl: { rejectUnauthorized: false },
      };
    }
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'flare_db',
    user: process.env.DB_USER || 'flare_user',
    password: process.env.DB_PASSWORD,
    ssl: (process.env.DB_SSL || 'false') === 'true' || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  };
};

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
