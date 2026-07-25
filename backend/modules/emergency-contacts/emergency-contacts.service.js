import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database.js';

export const getContacts = async (userId) => {
  const { rows } = await db.query(
    'SELECT * FROM emergency_contacts WHERE user_id = $1 ORDER BY created_at ASC',
    [userId]
  );
  return rows;
};

export const createContact = async (userId, { contactName, phone, relationship, notifyOnSos = true }) => {
  // Enforce max 5 contacts limit
  const { rows: countRes } = await db.query(
    'SELECT COUNT(*)::int as count FROM emergency_contacts WHERE user_id = $1',
    [userId]
  );

  if (countRes[0].count >= 5) {
    const err = new Error('Maximum limit of 5 emergency contacts exceeded');
    err.status = 400;
    throw err;
  }

  const id = uuidv4();

  const { rows } = await db.query(
    `INSERT INTO emergency_contacts (id, user_id, contact_name, phone, relationship, notify_on_sos)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, userId, contactName, phone, relationship, notifyOnSos]
  );

  return rows[0];
};

export const updateContact = async (userId, contactId, { contactName, phone, relationship, notifyOnSos }) => {
  const { rows: existing } = await db.query(
    'SELECT id FROM emergency_contacts WHERE id = $1 AND user_id = $2',
    [contactId, userId]
  );

  if (existing.length === 0) {
    const err = new Error('Emergency contact not found');
    err.status = 404;
    throw err;
  }

  const { rows } = await db.query(
    `UPDATE emergency_contacts 
     SET contact_name = COALESCE($1, contact_name), 
         phone = COALESCE($2, phone), 
         relationship = COALESCE($3, relationship), 
         notify_on_sos = COALESCE($4, notify_on_sos),
         updated_at = NOW()
     WHERE id = $5 AND user_id = $6
     RETURNING *`,
    [contactName, phone, relationship, notifyOnSos, contactId, userId]
  );

  return rows[0];
};

export const deleteContact = async (userId, contactId) => {
  const { rows: existing } = await db.query(
    'SELECT id FROM emergency_contacts WHERE id = $1 AND user_id = $2',
    [contactId, userId]
  );

  if (existing.length === 0) {
    const err = new Error('Emergency contact not found');
    err.status = 404;
    throw err;
  }

  await db.query(
    'DELETE FROM emergency_contacts WHERE id = $1 AND user_id = $2',
    [contactId, userId]
  );
};
export default {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
};
