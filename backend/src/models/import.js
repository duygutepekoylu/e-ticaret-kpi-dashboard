'use strict';

const { pool } = require('../config/database');

async function findAll({ sourceTable, status, page = 1, limit = 20 } = {}) {
  const where = [];
  const values = [];
  if (sourceTable) { where.push('source_table = ?'); values.push(sourceTable); }
  if (status)      { where.push('status = ?');       values.push(status); }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM imports ${whereClause}`, values);
  const [rows] = await pool.query(
    `SELECT * FROM imports ${whereClause} ORDER BY started_at DESC LIMIT ? OFFSET ?`,
    [...values, limit, (page - 1) * limit]
  );
  return { rows, total };
}

async function findById(id) {
  const [[row]] = await pool.query('SELECT * FROM imports WHERE id = ?', [id]);
  return row || null;
}

async function create({ userId, sourceTable, filename, fileType }) {
  const [result] = await pool.execute(
    'INSERT INTO imports (user_id, source_table, filename, file_type, status) VALUES (?, ?, ?, ?, ?)',
    [userId, sourceTable, filename, fileType, 'pending']
  );
  return result.insertId;
}

async function updateStatus(id, { status, totalRows, successRows, errorRows, errorMessage } = {}) {
  const fields = ['status = ?'];
  const values = [status];
  if (totalRows    !== undefined) { fields.push('total_rows = ?');    values.push(totalRows); }
  if (successRows  !== undefined) { fields.push('success_rows = ?');  values.push(successRows); }
  if (errorRows    !== undefined) { fields.push('error_rows = ?');    values.push(errorRows); }
  if (errorMessage !== undefined) { fields.push('error_message = ?'); values.push(String(errorMessage).slice(0, 1000)); }
  if (status === 'committed' || status === 'failed') fields.push('completed_at = NOW()');
  values.push(id);
  await pool.execute(`UPDATE imports SET ${fields.join(', ')} WHERE id = ?`, values);
}

async function updateSourceTable(id, sourceTable) {
  await pool.execute('UPDATE imports SET source_table = ?, status = ? WHERE id = ?', [sourceTable, 'pending', id]);
}

async function deleteById(id) {
  await pool.execute('DELETE FROM imports WHERE id = ?', [id]);
}

module.exports = { findAll, findById, create, updateStatus, updateSourceTable, deleteById };
