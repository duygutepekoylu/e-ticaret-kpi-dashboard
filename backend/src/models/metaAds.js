'use strict';

// Raw SQL — Meta Ads verisi
// KRİTİK: ROAS için action_values_fb_pixel_purchase kullanılmaz — gelir orders tablosundan gelir
const { pool } = require('../config/database');

async function findRaw({ importId, page = 1, limit = 20 } = {}) {
  const conditions = importId ? ['import_id = ?'] : [];
  const params = importId ? [importId] : [];
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.execute(`SELECT * FROM raw_meta_ads ${where} LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM raw_meta_ads ${where}`, params);
  return { rows, total };
}

async function findAll({ dateFrom, dateTo, campaign, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  if (dateFrom) { conditions.push('date >= ?');           params.push(dateFrom); }
  if (dateTo)   { conditions.push('date <= ?');           params.push(dateTo); }
  if (campaign) { conditions.push('campaign_name = ?');   params.push(campaign); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.execute(`SELECT * FROM meta_ads ${where} ORDER BY date DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM meta_ads ${where}`, params);
  return { rows, total };
}

async function getSpendSummary({ dateFrom, dateTo } = {}) {
  const conditions = [];
  const params = [];
  if (dateFrom) { conditions.push('date >= ?'); params.push(dateFrom); }
  if (dateTo)   { conditions.push('date <= ?'); params.push(dateTo); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [[row]] = await pool.execute(
    `SELECT SUM(spend) AS total_spend, SUM(impressions) AS total_impressions,
            SUM(clicks) AS total_clicks
     FROM meta_ads ${where}`,
    params
  );
  return row;
}

module.exports = { findRaw, findAll, getSpendSummary };
