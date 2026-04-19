'use strict';

const { pool } = require('../config/database');

async function findAll({ category, brand, gender, isActive, page = 1, limit = 20 } = {}) {
  const conditions = [];
  const params = [];
  if (category  !== undefined) { conditions.push('category = ?');  params.push(category); }
  if (brand     !== undefined) { conditions.push('brand = ?');     params.push(brand); }
  if (gender    !== undefined) { conditions.push('gender = ?');    params.push(gender); }
  if (isActive  !== undefined) { conditions.push('is_active = ?'); params.push(isActive ? 1 : 0); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const offset = (page - 1) * limit;

  const [rows] = await pool.execute(`SELECT * FROM products ${where} LIMIT ? OFFSET ?`, [...params, limit, offset]);
  const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM products ${where}`, params);
  return { rows, total };
}

async function findBySku(sku) {
  const [[row]] = await pool.execute('SELECT * FROM products WHERE sku = ?', [sku]);
  return row || null;
}

async function findCategories() {
  const [rows] = await pool.execute('SELECT DISTINCT category FROM products ORDER BY category');
  return rows.map(r => r.category);
}

async function create(data) {
  const { sku, productName, category, subCategory, brand, gender, price, costPrice, stockQuantity, isActive, createdAt, color, sizeRange } = data;
  await pool.execute(
    'INSERT INTO products (sku, product_name, category, sub_category, brand, gender, price, cost_price, stock_quantity, is_active, created_at, color, size_range) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [sku, productName, category, subCategory, brand, gender, price, costPrice, stockQuantity ?? 0, isActive ? 1 : 0, createdAt, color, sizeRange]
  );
  return sku;
}

module.exports = { findAll, findBySku, findCategories, create };
