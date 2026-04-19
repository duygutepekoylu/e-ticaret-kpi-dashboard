'use strict';

const { pool } = require('../config/database');

async function findAll({ platform, status, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  if (platform !== undefined) { conditions.push('platform = ?'); params.push(platform); }
  if (status   !== undefined) { conditions.push('status = ?');   params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.execute(`SELECT * FROM campaigns ${where} ORDER BY start_date DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM campaigns ${where}`, params);
  return { rows, total };
}

async function findByName(campaignName) {
  const [[row]] = await pool.execute('SELECT * FROM campaigns WHERE campaign_name = ?', [campaignName]);
  return row || null;
}

async function findNames() {
  const [rows] = await pool.execute('SELECT campaign_name, platform FROM campaigns ORDER BY campaign_name');
  return rows;
}

module.exports = { findAll, findByName, findNames };
