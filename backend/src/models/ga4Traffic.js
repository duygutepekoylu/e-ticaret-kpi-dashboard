'use strict';

// Raw SQL — GA4 session-scoped verisi
// KRİTİK: ga4_item_interactions ile bu tablo aynı sorguda JOIN yapılmaz (GA4 API kısıtı)
const { pool } = require('../config/database');

async function findRaw({ importId, page = 1, limit = 20 } = {}) {
  const conditions = importId ? ['import_id = ?'] : [];
  const params = importId ? [importId] : [];
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.execute(`SELECT * FROM raw_ga4_traffic ${where} LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM raw_ga4_traffic ${where}`, params);
  return { rows, total };
}

async function findAll({ dateFrom, dateTo, channel, device, city, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  if (dateFrom) { conditions.push('date >= ?');                          params.push(dateFrom); }
  if (dateTo)   { conditions.push('date <= ?');                          params.push(dateTo); }
  if (channel)  { conditions.push('session_default_channel_group = ?');  params.push(channel); }
  if (device)   { conditions.push('device_category = ?');                params.push(device); }
  if (city)     { conditions.push('city = ?');                           params.push(city); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.execute(`SELECT * FROM ga4_traffic ${where} ORDER BY date DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM ga4_traffic ${where}`, params);
  return { rows, total };
}

async function getSessionSummary({ dateFrom, dateTo } = {}) {
  const conditions = [];
  const params = [];
  if (dateFrom) { conditions.push('date >= ?'); params.push(dateFrom); }
  if (dateTo)   { conditions.push('date <= ?'); params.push(dateTo); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [[row]] = await pool.execute(
    `SELECT SUM(sessions) AS total_sessions, SUM(total_users) AS total_users,
            SUM(new_users) AS total_new_users, SUM(conversions) AS total_conversions,
            SUM(purchase_revenue) AS total_revenue
     FROM ga4_traffic ${where}`,
    params
  );
  return row;
}

module.exports = { findRaw, findAll, getSessionSummary };
