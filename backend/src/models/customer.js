'use strict';

const { pool } = require('../config/database');

async function findAll({ city, gender, ageGroup, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  if (city     !== undefined) { conditions.push('city = ?');      params.push(city); }
  if (gender   !== undefined) { conditions.push('gender = ?');    params.push(gender); }
  if (ageGroup !== undefined) { conditions.push('age_group = ?'); params.push(ageGroup); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.execute(`SELECT * FROM customers ${where} LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM customers ${where}`, params);
  return { rows, total };
}

async function findById(customerId) {
  const [[row]] = await pool.execute('SELECT * FROM customers WHERE customer_id = ?', [customerId]);
  return row || null;
}

async function updateOrderStats(customerId, { totalOrders, totalRevenue, lastOrderDate, firstOrderDate }) {
  await pool.execute(
    'UPDATE customers SET total_orders = ?, total_revenue = ?, last_order_date = ?, first_order_date = ? WHERE customer_id = ?',
    [totalOrders, totalRevenue, lastOrderDate, firstOrderDate, customerId]
  );
}

module.exports = { findAll, findById, updateOrderStats };
