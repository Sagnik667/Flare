import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

import db from '../../config/database.js';
import { signAccessToken, generateAndStoreRefreshToken, validateAndRotateRefreshToken, revokeRefreshToken, revokeAllUserTokens } from '../../config/jwt.js';
import { sendMail } from '../../config/mailer.js';
import { getWelcomeTemplate, getPasswordResetTemplate } from '../../utils/emailTemplates.js';
import { ROLES, USER_STATUS } from '../../utils/constants.js';
import logger from '../../config/logger.js';

export const registerUser = async ({ fullName, email, phone, password, role }) => {
  // Check unique email constraint
  const { rows: existingEmail } = await db.query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );
  if (existingEmail.length > 0) {
    const err = new Error('Email already exists');
    err.status = 400;
    throw err;
  }

  // Check unique phone constraint only if supplied
  if (phone) {
    const { rows: existingPhone } = await db.query(
      'SELECT id FROM users WHERE phone = $1',
      [phone]
    );
    if (existingPhone.length > 0) {
      const err = new Error('Phone number already exists');
      err.status = 400;
      throw err;
    }
  }

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(password, saltRounds);
  const userId = uuidv4();
  const emailVerifyToken = crypto.randomBytes(32).toString('hex');

  await db.query('BEGIN');
  try {
    // Create user
    await db.query(
      `INSERT INTO users (id, full_name, email, phone, password_hash, role, status, email_verified, email_verify_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, fullName, email, phone, passwordHash, role, USER_STATUS.ACTIVE, false, emailVerifyToken]
    );

    // If role is woman, create safety profile
    if (role === ROLES.WOMAN) {
      await db.query(
        `INSERT INTO safety_profiles (id, user_id, preferred_language)
         VALUES ($1, $2, $3)`,
        [uuidv4(), userId, 'en']
      );
    }

    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }

  // Send email asynchronously
  sendMail({
    to: email,
    subject: 'Welcome to Flare - Verify Your Email',
    html: getWelcomeTemplate(fullName),
  }).catch(err => logger.error('Failed to send welcome email', err));

  return {
    id: userId,
    fullName,
    email,
    phone,
    role,
    status: USER_STATUS.ACTIVE,
    emailVerified: false,
  };
};

export const loginUser = async ({ email, password }) => {
  // Account enumeration protection: generic "Invalid credentials" response
  const { rows } = await db.query(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );

  if (rows.length === 0) {
    const err = new Error('Account not found');
    err.status = 401;
    throw err;
  }

  const user = rows[0];

  if (user.status === USER_STATUS.SUSPENDED) {
    const err = new Error('Account is suspended');
    err.status = 403;
    throw err;
  }


  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    const err = new Error('Incorrect password');
    err.status = 401;
    throw err;
  }

  // Update last seen
  await db.query('UPDATE users SET last_seen = NOW() WHERE id = $1', [user.id]);

  const accessToken = signAccessToken(user);
  const refreshToken = await generateAndStoreRefreshToken(user.id);

  // Remove sensitive fields
  delete user.password_hash;
  delete user.email_verify_token;
  delete user.password_reset_token;
  delete user.password_reset_expires;

  return {
    accessToken,
    refreshToken,
    user,
  };
};


export const refreshSession = async (refreshToken) => {
  const result = await validateAndRotateRefreshToken(refreshToken);
  if (!result) {
    const err = new Error('Invalid or expired refresh token');
    err.status = 401;
    throw err;
  }

  const { userId, newRawToken } = result;

  const { rows } = await db.query(
    'SELECT id, role, status FROM users WHERE id = $1',
    [userId]
  );

  if (rows.length === 0) {
    const err = new Error('User not found');
    err.status = 401;
    throw err;
  }

  const user = rows[0];

  if (user.status === USER_STATUS.SUSPENDED) {
    const err = new Error('Account is suspended');
    err.status = 403;
    throw err;
  }

  const accessToken = signAccessToken(user);

  return {
    accessToken,
    refreshToken: newRawToken,
  };
};

export const logoutSession = async (refreshToken) => {
  await revokeRefreshToken(refreshToken);
};

export const forgotPassword = async (email) => {
  // Account enumeration protection: always return success
  const { rows } = await db.query('SELECT id, full_name FROM users WHERE email = $1', [email]);
  if (rows.length === 0) {
    return;
  }

  const user = rows[0];
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.query(
    'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
    [resetToken, resetExpires, user.id]
  );

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

  await sendMail({
    to: email,
    subject: 'Flare - Reset Your Password',
    html: getPasswordResetTemplate(resetUrl),
  });
};

export const resetPassword = async (token, newPassword) => {
  const { rows } = await db.query(
    'SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW()',
    [token]
  );

  if (rows.length === 0) {
    const err = new Error('Invalid or expired password reset link');
    err.status = 400;
    throw err;
  }

  const user = rows[0];
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(newPassword, saltRounds);

  await db.query('BEGIN');
  try {
    await db.query(
      `UPDATE users 
       SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, email_verified = true 
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    // Revoke all tokens on password change
    await revokeAllUserTokens(user.id);
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
};

export const getDevAdminCredentials = async () => {
  const adminEmail = process.env.DEV_ADMIN_EMAIL || 'admin@flare.local';
  const adminPassword = process.env.DEV_ADMIN_PASSWORD || 'Admin@Flare2026';

  const { rows } = await db.query(
    "SELECT id FROM users WHERE email = $1 AND role = 'admin' AND status = 'active'",
    [adminEmail]
  );

  if (rows.length === 0) {
    return null;
  }

  return { email: adminEmail, password: adminPassword };
};
