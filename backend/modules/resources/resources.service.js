import db from '../../config/database.js';
import { getNearbyResources } from '../location/location.service.js';

export const getResources = async (category = null) => {
  let sql = 'SELECT * FROM safety_resources WHERE is_active = true';
  const params = [];

  if (category) {
    sql += ' AND category = $1';
    params.push(category);
  }

  sql += ' ORDER BY name ASC';
  const { rows } = await db.query(sql, params);
  return rows;
};

export const getNearby = async (lat, lng, radius = 5, category = null) => {
  return getNearbyResources(lat, lng, { radius, category });
};

export const getResourceById = async (id) => {
  const { rows } = await db.query(
    'SELECT * FROM safety_resources WHERE id = $1 AND is_active = true',
    [id]
  );
  if (rows.length === 0) {
    const err = new Error('Resource not found');
    err.status = 404;
    throw err;
  }
  return rows[0];
};

export default {
  getResources,
  getNearby,
  getResourceById,
};
