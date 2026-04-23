'use strict';

const { pool } = require('../config/database');

async function findAll({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM users');
  const [rows] = await pool.query(
    'SELECT id, email, full_name, role, is_active, last_login_at, created_at, updated_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
    [limit, offset]
  );
  return { rows, total };
}

async function findById(id) {
  const [[row]] = await pool.query(
    'SELECT id, email, full_name, role, is_active, last_login_at, created_at, updated_at FROM users WHERE id = ?',
    [id]
  );
  return row || null;
}

async function findByEmail(email) {
  const [[row]] = await pool.query(
    'SELECT id, email, password_hash, full_name, role, is_active, last_login_at FROM users WHERE email = ?',
    [email]
  );
  return row || null;
}

async function create({ email, passwordHash, fullName, role = 'viewer' }) {
  const [result] = await pool.execute(
    'INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, ?)',
    [email, passwordHash, fullName, role]
  );
  return result.insertId;
}

async function updateLastLogin(id) {
  await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);
}

async function update(id, data) {
  const fields = [];
  const values = [];
  if (data.fullName  !== undefined) { fields.push('full_name = ?');  values.push(data.fullName); }
  if (data.role      !== undefined) { fields.push('role = ?');       values.push(data.role); }
  if (data.isActive  !== undefined) { fields.push('is_active = ?');  values.push(data.isActive ? 1 : 0); }
  if (!fields.length) return;
  values.push(id);
  await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
}

module.exports = { findAll, findById, findByEmail, create, updateLastLogin, update };
