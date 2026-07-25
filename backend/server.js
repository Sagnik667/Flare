import http from 'http';
import dotenv from 'dotenv';
import app from './app.js';
import { runMigrations } from './db/migrate.js';
import { initSocket } from './config/socket.js';
import logger from './config/logger.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Production safety guard: refuse to boot with a missing/weak JWT secret.
// The auth/socket/jwt modules fall back to a hard-coded dev secret when
// JWT_SECRET is unset — in production that would let anyone forge access tokens.
if (process.env.NODE_ENV === 'production') {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32 || secret.includes('fallback_secret') || secret.includes('super_secret_jwt_flare_app_key')) {
    logger.error('FATAL: JWT_SECRET is missing, too short, or uses a known default value. Set a unique 64+ char secret before starting in production.');
    process.exit(1);
  }
  if (!process.env.DB_PASSWORD) {
    logger.error('FATAL: DB_PASSWORD is not set in production.');
    process.exit(1);
  }
}

const startServer = async () => {
  try {
    // 1. Run migrations & seeds
    await runMigrations();

    // 2. Create HTTP server
    const server = http.createServer(app);

    // 3. Initialize Socket.io
    initSocket(server);

    // 4. Start listening
    server.listen(PORT, () => {
      logger.info(`Flare emergency backend server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });

    // Handle process termination for clean exit
    const shutdown = (signal) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
