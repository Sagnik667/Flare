import { v4 as uuidv4 } from 'uuid';
import db from '../../config/database.js';
import { ROLES, USER_STATUS, VOLUNTEER_STATUS, NOTIFICATION_TYPES } from '../../utils/constants.js';
import { createNotification } from '../notifications/notifications.service.js';
import { emitToUser } from '../../config/socket.js';
import { revokeAllUserTokens } from '../../config/jwt.js';
import logger from '../../config/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOADS_DIR = path.join(__dirname, '../../../uploads');

const checkIsCorrupted = (documentUrl) => {
  if (!documentUrl) return true;
  const filename = path.basename(documentUrl);
  const filepath = path.join(UPLOADS_DIR, filename);

  if (!fs.existsSync(filepath)) {
    return true;
  }

  try {
    const fileBytes = fs.readFileSync(filepath);
    
    // check magic bytes
    if (filename.endsWith('.png')) {
      return fileBytes.length < 8 || !fileBytes.slice(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
    }
    if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
      return fileBytes.length < 3 || !fileBytes.slice(0, 3).equals(Buffer.from('ffd8ff', 'hex'));
    }
    if (filename.endsWith('.pdf')) {
      return fileBytes.length < 4 || !fileBytes.slice(0, 4).equals(Buffer.from('%PDF', 'utf8'));
    }
  } catch (error) {
    return true;
  }

  return false;
};

export const getDashboardStats = async () => {
  const activeStatuses = ['active', 'volunteer_assigned', 'volunteer_en_route', 'volunteer_arrived', 'assisting'];

  const { rows: usersCount } = await db.query(
    'SELECT COUNT(*)::int as count FROM users WHERE role != \'admin\''
  );
  
  const { rows: volunteersCount } = await db.query(
    'SELECT COUNT(*)::int as count FROM volunteers'
  );

  const { rows: verifiedVolunteersCount } = await db.query(
    'SELECT COUNT(*)::int as count FROM volunteers WHERE verification_status = \'verified\''
  );

  const { rows: activeIncidentsCount } = await db.query(
    'SELECT COUNT(*)::int as count FROM emergency_incidents WHERE status = ANY($1)',
    [activeStatuses]
  );

  const { rows: resolvedIncidentsCount } = await db.query(
    'SELECT COUNT(*)::int as count FROM emergency_incidents WHERE status = \'resolved\''
  );

  const { rows: avgResponseTime } = await db.query(
    `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)))::float, 0) as avg_time 
     FROM emergency_incidents 
     WHERE status = 'resolved'`
  );

  const { rows: acceptanceRate } = await db.query(
    `SELECT COALESCE((COUNT(CASE WHEN assignment_status = 'accepted' THEN 1 END)::float / NULLIF(COUNT(*), 0)) * 100, 0) as rate 
     FROM incident_assignments`
  );

  return {
    totalUsers: usersCount[0].count,
    totalVolunteers: volunteersCount[0].count,
    verifiedVolunteers: verifiedVolunteersCount[0].count,
    activeIncidents: activeIncidentsCount[0].count,
    resolvedIncidents: resolvedIncidentsCount[0].count,
    avgResponseTime: Math.round(avgResponseTime[0].avg_time), // in seconds
    acceptanceRate: Math.round(acceptanceRate[0].rate * 10) / 10, // round to 1 decimal place
  };
};

export const getIncidents = async ({ status, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  let sql = `
    SELECT ei.*, 
           u.full_name as user_name, u.email as user_email, u.phone as user_phone,
           (SELECT json_build_object('id', v.id, 'name', ru.full_name, 'phone', ru.phone)
            FROM incident_assignments ia
            JOIN volunteers v ON ia.volunteer_id = v.id
            JOIN users ru ON v.user_id = ru.id
            WHERE ia.incident_id = ei.id AND ia.assignment_status::text = ANY(ARRAY['accepted', 'en_route', 'arrived', 'assisting', 'resolved'])
            LIMIT 1) as volunteer_info
    FROM emergency_incidents ei
    JOIN users u ON ei.user_id = u.id
  `;
  const params = [];

  if (status) {
    if (status === 'active') {
      sql += ' WHERE ei.status = ANY($1)';
      params.push(['active', 'volunteer_assigned', 'volunteer_en_route', 'volunteer_arrived', 'assisting']);
    } else if (status === 'volunteer_assigned') {
      sql += ' WHERE ei.status = ANY($1)';
      params.push(['volunteer_assigned', 'volunteer_en_route', 'volunteer_arrived']);
    } else {
      sql += ' WHERE ei.status = $1';
      params.push(status);
    }
  }

  sql += ` ORDER BY ei.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const { rows } = await db.query(sql, params);

  // Total count
  let countSql = 'SELECT COUNT(*) FROM emergency_incidents';
  const countParams = [];
  if (status) {
    if (status === 'active') {
      countSql += ' WHERE status = ANY($1)';
      countParams.push(['active', 'volunteer_assigned', 'volunteer_en_route', 'volunteer_arrived', 'assisting']);
    } else if (status === 'volunteer_assigned') {
      countSql += ' WHERE status = ANY($1)';
      countParams.push(['volunteer_assigned', 'volunteer_en_route', 'volunteer_arrived']);
    } else {
      countSql += ' WHERE status = $1';
      countParams.push(status);
    }
  }
  const countRes = await db.query(countSql, countParams);
  const total = parseInt(countRes.rows[0].count, 10);
  const pages = Math.ceil(total / limit) || 1;

  return {
    incidents: rows,
    pagination: { total, page, limit, pages },
  };
};

export const getUsers = async ({ search, role, status, page = 1, limit = 20 }) => {
  const offset = (page - 1) * limit;
  let sql = 'SELECT id, full_name, email, phone, role, status, last_seen, created_at FROM users WHERE role != \'admin\'';
  const params = [];

  if (search) {
    sql += ` AND (full_name ILIKE $${params.length + 1} OR email ILIKE $${params.length + 1} OR phone ILIKE $${params.length + 1})`;
    params.push(`%${search}%`);
  }

  if (role) {
    sql += ` AND role = $${params.length + 1}`;
    params.push(role);
  }

  if (status) {
    sql += ` AND status = $${params.length + 1}`;
    params.push(status);
  }

  sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  const { rows } = await db.query(sql, params);

  // Count
  let countSql = 'SELECT COUNT(*) FROM users WHERE role != \'admin\'';
  const countParams = [];
  if (search) {
    countSql += ` AND (full_name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1)`;
    countParams.push(`%${search}%`);
  }
  if (role) {
    countSql += ` AND role = $${countParams.length + 1}`;
    countParams.push(role);
  }
  if (status) {
    countSql += ` AND status = $${countParams.length + 1}`;
    countParams.push(status);
  }
  
  const countRes = await db.query(countSql, countParams);
  const total = parseInt(countRes.rows[0].count, 10);
  const pages = Math.ceil(total / limit) || 1;

  return {
    users: rows,
    pagination: { total, page, limit, pages },
  };
};

export const updateUserStatus = async (adminUserId, targetUserId, newStatus) => {
  // Prevent self suspension
  if (adminUserId === targetUserId) {
    const err = new Error('Admin cannot modify their own account status');
    err.status = 400;
    throw err;
  }

  // Fetch user role
  const { rows: users } = await db.query('SELECT role, full_name FROM users WHERE id = $1', [targetUserId]);
  if (users.length === 0) {
    const err = new Error('User not found');
    err.status = 404;
    throw err;
  }

  const targetUser = users[0];

  // Prevent modifying other admins
  if (targetUser.role === ROLES.ADMIN) {
    const err = new Error('Admin cannot modify other admin accounts');
    err.status = 403;
    throw err;
  }

  await db.query('BEGIN');
  try {
    await db.query(
      'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
      [newStatus, targetUserId]
    );

    // Audit trail logging
    const eventType = newStatus === USER_STATUS.SUSPENDED ? 'USER_SUSPENDED' : 'USER_REACTIVATED';
    const description = `User account of ${targetUser.full_name} (${targetUserId}) was set to status ${newStatus} by admin.`;
    await db.query(
      `INSERT INTO incident_timeline (id, incident_id, actor_id, event_type, description, metadata)
       VALUES ($1, NULL, $2, $3, $4, $5)`,
      [uuidv4(), adminUserId, eventType, description, JSON.stringify({ targetUserId })]
    );

    if (newStatus === USER_STATUS.SUSPENDED) {
      // Revoke all sessions immediately on suspension
      await revokeAllUserTokens(targetUserId);
    }

    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
};

export const getPendingVolunteers = async () => {
  const { rows } = await db.query(
    `SELECT v.*, u.full_name, u.email, u.phone 
     FROM volunteers v
     JOIN users u ON v.user_id = u.id
     WHERE v.verification_status = 'pending'
     ORDER BY v.created_at ASC`
  );
  return rows.map(r => ({
    ...r,
    is_document_corrupted: checkIsCorrupted(r.document_url)
  }));
};

export const verifyVolunteer = async (adminUserId, volunteerId, action, reason = '') => {
  const { rows: vols } = await db.query('SELECT user_id, verification_status FROM volunteers WHERE id = $1', [volunteerId]);
  if (vols.length === 0) {
    const err = new Error('Volunteer profile not found');
    err.status = 404;
    throw err;
  }

  const vol = vols[0];

  // Enforce pending-only reviews (no direct verification transition bypass)
  if (vol.verification_status !== VOLUNTEER_STATUS.PENDING) {
    const err = new Error('Volunteer profile is not in pending status');
    err.status = 400;
    throw err;
  }

  const client = await db.getClient();
  await client.query('BEGIN');
  try {
    if (action === 'verify') {
      // Approve: pending -> verified
      await client.query(
        `UPDATE volunteers 
         SET verification_status = $1, verified_at = NOW(), verified_by = $2, rejection_reason = NULL, updated_at = NOW() 
         WHERE id = $3`,
        [VOLUNTEER_STATUS.VERIFIED, adminUserId, volunteerId]
      );

      // Update user account role to volunteer and status to active
      await client.query(
        `UPDATE users SET role = $1, status = $2 WHERE id = $3`,
        [ROLES.VOLUNTEER, USER_STATUS.ACTIVE, vol.user_id]
      );

      // Audit trail
      await client.query(
        `INSERT INTO incident_timeline (id, incident_id, actor_id, event_type, description, metadata)
         VALUES ($1, NULL, $2, 'VOLUNTEER_APPROVED', $3, $4)`,
        [uuidv4(), adminUserId, `Volunteer profile ${volunteerId} approved.`, JSON.stringify({ volunteerId })]
      );
    } else if (action === 'reject') {
      // Reject: pending -> rejected
      await client.query(
        `UPDATE volunteers 
         SET verification_status = $1, rejection_reason = $2, verified_at = NULL, verified_by = NULL, updated_at = NOW() 
         WHERE id = $3`,
        [VOLUNTEER_STATUS.REJECTED, reason, volunteerId]
      );

      // Set user account status to active (they can login but remain unverified volunteer)
      await client.query(
        `UPDATE users SET status = $1 WHERE id = $2`,
        [USER_STATUS.ACTIVE, vol.user_id]
      );

      // Audit trail
      await client.query(
        `INSERT INTO incident_timeline (id, incident_id, actor_id, event_type, description, metadata)
         VALUES ($1, NULL, $2, 'VOLUNTEER_REJECTED', $3, $4)`,
        [uuidv4(), adminUserId, `Volunteer profile ${volunteerId} rejected. Reason: ${reason}`, JSON.stringify({ volunteerId, reason })]
      );
    } else {
      const err = new Error('Invalid verification action');
      err.status = 400;
      throw err;
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  // Create notifications & socket emits
  try {
    const notifyType = action === 'verify' ? NOTIFICATION_TYPES.VOLUNTEER_VERIFIED : NOTIFICATION_TYPES.VOLUNTEER_REJECTED;
    const notifyTitle = action === 'verify' ? 'Volunteer Profile Verified' : 'Volunteer Profile Rejected';
    const notifyMsg = action === 'verify' 
      ? 'Congratulations! Your safety responder profile has been verified and you are now active.' 
      : `Your responder profile application was rejected. Reason: ${reason || 'none'}`;
    
    await createNotification({
      userId: vol.user_id,
      type: notifyType,
      title: notifyTitle,
      message: notifyMsg,
      metadata: { volunteerId },
    });

    const socketEvent = action === 'verify' ? 'volunteer_verified' : 'volunteer_rejected';
    emitToUser(vol.user_id, socketEvent, { volunteerId });
  } catch (notifyError) {
    logger.error('Failed to notify volunteer of review outcome:', notifyError);
  }
};

export const getResources = async () => {
  const { rows: resources } = await db.query(
    'SELECT * FROM safety_resources WHERE is_active = true ORDER BY name ASC'
  );

  const data = [];
  for (const r of resources) {
    const { rows: weekly } = await db.query('SELECT day_of_week FROM weekly_closed_days WHERE resource_id = $1', [r.id]);
    const { rows: special } = await db.query('SELECT closed_date FROM special_closed_dates WHERE resource_id = $1', [r.id]);
    const { rows: temp } = await db.query('SELECT closed_from, closed_until FROM resource_temporary_closures WHERE resource_id = $1', [r.id]);

    data.push({
      ...r,
      weekly_closed_days: weekly.map(w => w.day_of_week),
      special_closed_dates: special.map(s => {
        // Ensure dates are parsed correctly as YYYY-MM-DD
        const d = new Date(s.closed_date);
        return d.toISOString().split('T')[0];
      }),
      temporary_closures: temp,
    });
  }
  return data;
};

export const createResource = async (adminUserId, {
  name, category, address, phone, latitude, longitude,
  opening_time = '00:00:00', closing_time = '23:59:59',
  weekly_closed_days = [], special_closed_dates = [],
  is_permanently_closed = false
}) => {
  const id = uuidv4();
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
    const err = new Error('Invalid coordinates range');
    err.status = 400;
    throw err;
  }

  const client = await db.getClient();
  await client.query('BEGIN');
  try {
    await client.query(
      `INSERT INTO safety_resources (id, name, category, address, phone, latitude, longitude, is_active, created_by, opening_time, closing_time, is_permanently_closed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10, $11)`,
      [id, name, category, address, phone, lat, lng, adminUserId, opening_time, closing_time, is_permanently_closed]
    );

    if (weekly_closed_days && weekly_closed_days.length > 0) {
      for (const day of weekly_closed_days) {
        await client.query(
          `INSERT INTO weekly_closed_days (id, resource_id, day_of_week) VALUES ($1, $2, $3)`,
          [uuidv4(), id, day]
        );
      }
    }

    if (special_closed_dates && special_closed_dates.length > 0) {
      for (const dateStr of special_closed_dates) {
        await client.query(
          `INSERT INTO special_closed_dates (id, resource_id, closed_date) VALUES ($1, $2, $3)`,
          [uuidv4(), id, dateStr]
        );
      }
    }

    // Audit log
    await client.query(
      `INSERT INTO incident_timeline (id, incident_id, actor_id, event_type, description, metadata)
       VALUES ($1, NULL, $2, 'RESOURCE_CREATED', $3, $4)`,
      [uuidv4(), adminUserId, `Resource ${name} (${category}) created.`, JSON.stringify({ resourceId: id, name })]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return {
    id, name, category, address, phone, latitude: lat, longitude: lng, is_active: true,
    opening_time, closing_time, is_permanently_closed, weekly_closed_days, special_closed_dates
  };
};

export const updateResource = async (adminUserId, resourceId, {
  name, category, address, phone, latitude, longitude,
  opening_time = '00:00:00', closing_time = '23:59:59',
  weekly_closed_days = [], special_closed_dates = [],
  is_permanently_closed = false
}) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
    const err = new Error('Invalid coordinates range');
    err.status = 400;
    throw err;
  }

  const { rows } = await db.query('SELECT id FROM safety_resources WHERE id = $1', [resourceId]);
  if (rows.length === 0) {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }

  const client = await db.getClient();
  await client.query('BEGIN');
  try {
    await client.query(
      `UPDATE safety_resources 
       SET name = $1, category = $2, address = $3, phone = $4, latitude = $5, longitude = $6,
           opening_time = $7, closing_time = $8, is_permanently_closed = $9
       WHERE id = $10`,
      [name, category, address, phone, lat, lng, opening_time, closing_time, is_permanently_closed, resourceId]
    );

    await client.query('DELETE FROM weekly_closed_days WHERE resource_id = $1', [resourceId]);
    if (weekly_closed_days && weekly_closed_days.length > 0) {
      for (const day of weekly_closed_days) {
        await client.query(
          `INSERT INTO weekly_closed_days (id, resource_id, day_of_week) VALUES ($1, $2, $3)`,
          [uuidv4(), resourceId, day]
        );
      }
    }

    await client.query('DELETE FROM special_closed_dates WHERE resource_id = $1', [resourceId]);
    if (special_closed_dates && special_closed_dates.length > 0) {
      for (const dateStr of special_closed_dates) {
        await client.query(
          `INSERT INTO special_closed_dates (id, resource_id, closed_date) VALUES ($1, $2, $3)`,
          [uuidv4(), resourceId, dateStr]
        );
      }
    }

    // Audit log
    await client.query(
      `INSERT INTO incident_timeline (id, incident_id, actor_id, event_type, description, metadata)
       VALUES ($1, NULL, $2, 'RESOURCE_UPDATED', $3, $4)`,
      [uuidv4(), adminUserId, `Resource ${name} (${resourceId}) updated.`, JSON.stringify({ resourceId })]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }

  return {
    id: resourceId, name, category, address, phone, latitude: lat, longitude: lng,
    opening_time, closing_time, is_permanently_closed, weekly_closed_days, special_closed_dates
  };
};

export const deleteResource = async (adminUserId, resourceId) => {
  const { rows } = await db.query('SELECT name FROM safety_resources WHERE id = $1', [resourceId]);
  if (rows.length === 0) {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }

  const resourceName = rows[0].name;

  await db.query('BEGIN');
  try {
    // Soft deactivate only (Never hard delete)
    await db.query(
      `UPDATE safety_resources SET is_active = false WHERE id = $1`,
      [resourceId]
    );

    // Audit log
    await db.query(
      `INSERT INTO incident_timeline (id, incident_id, actor_id, event_type, description, metadata)
       VALUES ($1, NULL, $2, 'RESOURCE_DEACTIVATED', $3, $4)`,
      [uuidv4(), adminUserId, `Resource ${resourceName} (${resourceId}) deactivated.`, JSON.stringify({ resourceId })]
    );

    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
};

// Admin Recommended Resources & Closure Recommendations service functions
export const getResourceRecommendations = async () => {
  const { rows: recs } = await db.query(
    `SELECT rr.*, u.full_name as volunteer_name, u.email as volunteer_email 
     FROM resource_recommendations rr
     LEFT JOIN users u ON rr.recommended_by = u.id
     ORDER BY rr.created_at DESC`
  );
  const data = [];
  for (const r of recs) {
    const { rows: weekly } = await db.query('SELECT day_of_week FROM recommended_weekly_closed_days WHERE recommendation_id = $1', [r.id]);
    const { rows: special } = await db.query('SELECT closed_date FROM recommended_special_closed_dates WHERE recommendation_id = $1', [r.id]);
    data.push({
      ...r,
      weekly_closed_days: weekly.map(w => w.day_of_week),
      special_closed_dates: special.map(s => {
        const d = new Date(s.closed_date);
        return d.toISOString().split('T')[0];
      }),
    });
  }
  return data;
};

export const reviewResourceRecommendation = async (adminUserId, recommendationId, {
  action, name, category, address, phone, latitude, longitude,
  opening_time = '00:00:00', closing_time = '23:59:59',
  weekly_closed_days = [], special_closed_dates = []
}) => {
  const { rows: recs } = await db.query('SELECT status FROM resource_recommendations WHERE id = $1', [recommendationId]);
  if (recs.length === 0) {
    const err = new Error('Resource recommendation not found');
    err.status = 404;
    throw err;
  }

  const rec = recs[0];
  if (rec.status !== 'pending') {
    const err = new Error('Recommendation has already been reviewed');
    err.status = 400;
    throw err;
  }

  const client = await db.getClient();
  await client.query('BEGIN');
  try {
    if (action === 'approve') {
      const resourceId = uuidv4();
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      // Create new registered safety resource
      await client.query(
        `INSERT INTO safety_resources (id, name, category, address, phone, latitude, longitude, is_active, created_by, opening_time, closing_time, is_permanently_closed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8, $9, $10, false)`,
        [resourceId, name, category, address, phone, lat, lng, adminUserId, opening_time, closing_time]
      );

      // Insert closures
      if (weekly_closed_days && weekly_closed_days.length > 0) {
        for (const day of weekly_closed_days) {
          await client.query(
            `INSERT INTO weekly_closed_days (id, resource_id, day_of_week) VALUES ($1, $2, $3)`,
            [uuidv4(), resourceId, day]
          );
        }
      }

      if (special_closed_dates && special_closed_dates.length > 0) {
        for (const dateStr of special_closed_dates) {
          await client.query(
            `INSERT INTO special_closed_dates (id, resource_id, closed_date) VALUES ($1, $2, $3)`,
            [uuidv4(), resourceId, dateStr]
          );
        }
      }

      // Update recommendation status
      await client.query(
        `UPDATE resource_recommendations SET status = 'approved' WHERE id = $1`,
        [recommendationId]
      );

      // Audit log
      await client.query(
        `INSERT INTO incident_timeline (id, incident_id, actor_id, event_type, description, metadata)
         VALUES ($1, NULL, $2, 'RESOURCE_RECOMMENDATION_APPROVED', $3, $4)`,
        [uuidv4(), adminUserId, `Recommendation for ${name} approved. Resource registered.`, JSON.stringify({ resourceId, recommendationId })]
      );
    } else {
      // Reject
      await client.query(
        `UPDATE resource_recommendations SET status = 'rejected' WHERE id = $1`,
        [recommendationId]
      );

      // Audit log
      await client.query(
        `INSERT INTO incident_timeline (id, incident_id, actor_id, event_type, description, metadata)
         VALUES ($1, NULL, $2, 'RESOURCE_RECOMMENDATION_REJECTED', $3, $4)`,
        [uuidv4(), adminUserId, `Resource recommendation ${recommendationId} rejected.`, JSON.stringify({ recommendationId })]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const getClosureRecommendations = async () => {
  const { rows } = await db.query(
    `SELECT cr.*, 
            sr.name as resource_name, sr.category as resource_category, sr.address as resource_address,
            u.full_name as volunteer_name, u.email as volunteer_email
     FROM closure_recommendations cr
     JOIN safety_resources sr ON cr.resource_id = sr.id
     LEFT JOIN users u ON cr.recommended_by = u.id
     ORDER BY cr.created_at DESC`
  );
  return rows;
};

export const reviewClosureRecommendation = async (adminUserId, closureId, { action }) => {
  const { rows: closures } = await db.query('SELECT * FROM closure_recommendations WHERE id = $1', [closureId]);
  if (closures.length === 0) {
    const err = new Error('Closure recommendation not found');
    err.status = 404;
    throw err;
  }

  const cl = closures[0];
  if (cl.status !== 'pending') {
    const err = new Error('Closure recommendation has already been reviewed');
    err.status = 400;
    throw err;
  }

  const client = await db.getClient();
  await client.query('BEGIN');
  try {
    if (action === 'approve') {
      if (cl.closure_type === 'permanent') {
        // Set permanently closed to true
        await client.query(
          `UPDATE safety_resources SET is_permanently_closed = true WHERE id = $1`,
          [cl.resource_id]
        );
      } else {
        // Insert temporary closure range
        const tempId = uuidv4();
        await client.query(
          `INSERT INTO resource_temporary_closures (id, resource_id, closed_from, closed_until)
           VALUES ($1, $2, $3, $4)`,
          [tempId, cl.resource_id, cl.closed_from, cl.until_unknown ? null : cl.closed_until]
        );
      }

      await client.query(
        `UPDATE closure_recommendations SET status = 'approved' WHERE id = $1`,
        [closureId]
      );

      // Audit log
      await client.query(
        `INSERT INTO incident_timeline (id, incident_id, actor_id, event_type, description, metadata)
         VALUES ($1, NULL, $2, 'RESOURCE_CLOSURE_APPROVED', $3, $4)`,
        [uuidv4(), adminUserId, `Closure recommendation approved for resource ${cl.resource_id}.`, JSON.stringify({ resourceId: cl.resource_id, closureId })]
      );
    } else {
      // Reject
      await client.query(
        `UPDATE closure_recommendations SET status = 'rejected' WHERE id = $1`,
        [closureId]
      );

      // Audit log
      await client.query(
        `INSERT INTO incident_timeline (id, incident_id, actor_id, event_type, description, metadata)
         VALUES ($1, NULL, $2, 'RESOURCE_CLOSURE_REJECTED', $3, $4)`,
        [uuidv4(), adminUserId, `Closure recommendation ${closureId} rejected.`, JSON.stringify({ closureId })]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};
