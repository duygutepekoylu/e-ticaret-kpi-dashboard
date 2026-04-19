'use strict';

// Raw SQL — GA4 item-scoped verisi
// KRİTİK: ga4_traffic ile bu tablo aynı sorguda JOIN yapılmaz (GA4 API kısıtı)
const { pool } = require('../config/database');

async function findRaw({ importId, page = 1, limit = 20 } = {}) {
  const conditions = importId ? ['import_id = ?'] : [];
  const params = importId ? [importId] : [];
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.execute(`SELECT * FROM raw_ga4_item_interactions ${where} LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM raw_ga4_item_interactions ${where}`, params);
  return { rows, total };
}

async function findAll({ dateFrom, dateTo, itemId, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  if (dateFrom) { conditions.push('date >= ?');    params.push(dateFrom); }
  if (dateTo)   { conditions.push('date <= ?');    params.push(dateTo); }
  if (itemId)   { conditions.push('item_id = ?');  params.push(itemId); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.execute(`SELECT * FROM ga4_item_interactions ${where} ORDER BY date DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM ga4_item_interactions ${where}`, params);
  return { rows, total };
}

async function getItemSummary({ dateFrom, dateTo } = {}) {
  const conditions = [];
  const params = [];
  if (dateFrom) { conditions.push('date >= ?'); params.push(dateFrom); }
  if (dateTo)   { conditions.push('date <= ?'); params.push(dateTo); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [[row]] = await pool.execute(
    `SELECT SUM(items_viewed) AS total_viewed, SUM(items_added_to_cart) AS total_added,
            SUM(items_purchased) AS total_purchased, SUM(item_revenue) AS total_revenue
     FROM ga4_item_interactions ${where}`,
    params
  );
  return row;
}

module.exports = { findRaw, findAll, getItemSummary };
