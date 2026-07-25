import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import db from './database.js';
import logger from './logger.js';
import { v4 as uuidv4 } from 'uuid';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_local_development_only_replace_in_production_environment_variables';
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_DAYS = 30; // 30 days

// Hash utility
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

export const signAccessToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
      status: user.status,
    },
    JWT_SECRET,
    {
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'flare',
    }
  );
};

export const generateAndStoreRefreshToken = async (userId) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

  await db.query(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [uuidv4(), userId, tokenHash, expiresAt]
  );

  return rawToken;
};

export const validateAndRotateRefreshToken = async (rawToken) => {
  const tokenHash = hashToken(rawToken);
  
  // Find token in DB
  const { rows } = await db.query(
    `SELECT * FROM refresh_tokens 
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [tokenHash]
  );

  if (rows.length === 0) {
    logger.warn('Failed attempt to use refresh token (invalid, revoked, or expired)');
    return null; // Invalid token
  }

  const tokenRecord = rows[0];

  // Rotate: Revoke the current token
  await db.query(
    `UPDATE refresh_tokens 
     SET revoked_at = NOW() 
     WHERE id = $1`,
    [tokenRecord.id]
  );

  // Generate a brand new refresh token
  const newRawToken = await generateAndStoreRefreshToken(tokenRecord.user_id);
  
  return {
    userId: tokenRecord.user_id,
    newRawToken,
  };
};

export const revokeRefreshToken = async (rawToken) => {
  const tokenHash = hashToken(rawToken);
  await db.query(
    `UPDATE refresh_tokens 
     SET revoked_at = NOW() 
     WHERE token_hash = $1`,
    [tokenHash]
  );
};

export const revokeAllUserTokens = async (userId) => {
  await db.query(
    `UPDATE refresh_tokens 
     SET revoked_at = NOW() 
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId]
  );
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET, { issuer: 'flare' });
  } catch (error) {
    return null;
  }
};

export default {
  signAccessToken,
  generateAndStoreRefreshToken,
  validateAndRotateRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  verifyAccessToken,
};
