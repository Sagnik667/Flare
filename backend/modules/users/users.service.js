import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database.js';
import { revokeAllUserTokens } from '../../config/jwt.js';

export const getProfile = async (userId) => {
  const { rows } = await db.query(
    `SELECT u.id, u.full_name, u.email, u.phone, u.role, u.status, u.email_verified,
            (u.password_hash IS NOT NULL) AS has_password,
            sp.blood_group, sp.medical_notes, sp.emergency_instructions, sp.preferred_language
     FROM users u
     LEFT JOIN safety_profiles sp ON u.id = sp.user_id
     WHERE u.id = $1`,
    [userId]
  );

  if (rows.length === 0) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  return rows[0];
};

export const updateProfile = async (userId, { fullName, phone }) => {
  // Check unique phone if provided
  if (phone) {
    const { rows: existing } = await db.query(
      'SELECT id FROM users WHERE phone = $1 AND id != $2',
      [phone, userId]
    );
    if (existing.length > 0) {
      const err = new Error('Phone number is already in use');
      err.status = 400;
      throw err;
    }
  }

  const { rows } = await db.query(
    `UPDATE users 
     SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone), updated_at = NOW()
     WHERE id = $3
     RETURNING id, full_name, email, phone, role, status`,
    [fullName, phone, userId]
  );

  return rows[0];
};

export const getSafetyProfile = async (userId) => {
  const { rows } = await db.query(
    'SELECT * FROM safety_profiles WHERE user_id = $1',
    [userId]
  );
  if (rows.length === 0) {
    return null;
  }
  return rows[0];
};

export const updateSafetyProfile = async (userId, { bloodGroup, medicalNotes, emergencyInstructions, preferredLanguage }) => {
  const { rows } = await db.query(
    `INSERT INTO safety_profiles (id, user_id, blood_group, medical_notes, emergency_instructions, preferred_language)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (user_id) DO UPDATE 
     SET blood_group = EXCLUDED.blood_group,
         medical_notes = EXCLUDED.medical_notes,
         emergency_instructions = EXCLUDED.emergency_instructions,
         preferred_language = EXCLUDED.preferred_language,
         updated_at = NOW()
     RETURNING *`,
    [uuidv4(), userId, bloodGroup, medicalNotes, emergencyInstructions, preferredLanguage || 'en']
  );

  return rows[0];
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const { rows } = await db.query(
    'SELECT password_hash FROM users WHERE id = $1',
    [userId]
  );

  if (rows.length === 0) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const user = rows[0];

  const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
  if (!isMatch) {
    const err = new Error('Incorrect current password');
    err.status = 400;
    throw err;
  }

  const saltRounds = 12;
  const newHash = await bcrypt.hash(newPassword, saltRounds);

  await db.query('BEGIN');
  try {
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, userId]
    );

    // Revoke all active refresh sessions upon credentials alteration
    await revokeAllUserTokens(userId);
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
};
