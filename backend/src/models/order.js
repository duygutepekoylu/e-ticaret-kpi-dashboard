'use strict';

const { pool } = require('../config/database');

async function findAll({ dateFrom, dateTo, channel, campaign, customerId, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  if (dateFrom)    { conditions.push('DATE(order_date) >= ?'); params.push(dateFrom); }
  if (dateTo)      { conditions.push('DATE(order_date) <= ?'); params.push(dateTo); }
  if (channel)     { conditions.push('channel = ?');           params.push(channel); }
  if (campaign)    { conditions.push('campaign_name = ?');     params.push(campaign); }
  if (customerId)  { conditions.push('customer_id = ?');       params.push(customerId); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.execute(`SELECT * FROM orders ${where} ORDER BY order_date DESC LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM orders ${where}`, params);
  return { rows, total };
}

async function findById(orderId) {
  const [[row]] = await pool.execute('SELECT * FROM orders WHERE order_id = ?', [orderId]);
  return row || null;
}

async function getRevenueSummary({ dateFrom, dateTo } = {}) {
  const conditions = [];
  const params = [];
  if (dateFrom) { conditions.push('DATE(order_date) >= ?'); params.push(dateFrom); }
  if (dateTo)   { conditions.push('DATE(order_date) <= ?'); params.push(dateTo); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [[row]] = await pool.execute(
    `SELECT COUNT(*) AS total_orders, SUM(net_revenue) AS total_revenue, AVG(net_revenue) AS avg_order_value
     FROM orders ${where}`,
    params
  );
  return row;
}

module.exports = { findAll, findById, getRevenueSummary };
