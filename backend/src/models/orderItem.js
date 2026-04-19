'use strict';

const { pool } = require('../config/database');

async function findByOrderId(orderId) {
  const [rows] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
  return rows;
}

async function findAll({ itemId, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  if (itemId !== undefined) { conditions.push('item_id = ?'); params.push(itemId); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.execute(`SELECT * FROM order_items ${where} LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM order_items ${where}`, params);
  return { rows, total };
}

async function getTopProducts({ dateFrom, dateTo, limit = 10 } = {}) {
  const conditions = ['1=1'];
  const params = [];
  if (dateFrom) { conditions.push('DATE(o.order_date) >= ?'); params.push(dateFrom); }
  if (dateTo)   { conditions.push('DATE(o.order_date) <= ?'); params.push(dateTo); }

  const [rows] = await pool.execute(
    `SELECT oi.item_id, oi.item_name, oi.item_brand, oi.item_category,
            SUM(oi.quantity) AS total_quantity, SUM(oi.line_total) AS total_revenue, COUNT(DISTINCT oi.order_id) AS order_count
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.order_id
     WHERE ${conditions.join(' AND ')}
     GROUP BY oi.item_id, oi.item_name, oi.item_brand, oi.item_category
     ORDER BY total_revenue DESC LIMIT ?`,
    [...params, limit]
  );
  return rows;
}

module.exports = { findByOrderId, findAll, getTopProducts };
