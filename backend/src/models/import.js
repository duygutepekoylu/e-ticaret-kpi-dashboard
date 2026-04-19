'use strict';

const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');

const Import = sequelize.define('Import', {
  id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id:      { type: DataTypes.INTEGER, allowNull: false },
  source_table: { type: DataTypes.STRING(100), allowNull: false },
  filename:     { type: DataTypes.STRING(500), allowNull: false },
  file_type:    { type: DataTypes.STRING(10), allowNull: false },
  status:       { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'pending' },
  total_rows:   { type: DataTypes.INTEGER, allowNull: true },
  success_rows: { type: DataTypes.INTEGER, allowNull: true },
  error_rows:   { type: DataTypes.INTEGER, allowNull: true },
  error_message:{ type: DataTypes.TEXT, allowNull: true },
  started_at:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  completed_at: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'imports',
  timestamps: false,
});

async function findAll({ sourceTable, status, page = 1, limit = 20 } = {}) {
  const where = {};
  if (sourceTable) where.source_table = sourceTable;
  if (status) where.status = status;
  const offset = (page - 1) * limit;
  const { rows, count } = await Import.findAndCountAll({ where, limit, offset, order: [['started_at', 'DESC']] });
  return { rows, total: count };
}

async function findById(id) {
  return Import.findByPk(id);
}

async function create({ userId, sourceTable, filename, fileType }) {
  const imp = await Import.create({
    user_id: userId,
    source_table: sourceTable,
    filename,
    file_type: fileType,
    status: 'pending',
  });
  return imp.id;
}

async function updateStatus(id, { status, totalRows, successRows, errorRows, errorMessage } = {}) {
  const updates = {};
  if (status      !== undefined) updates.status = status;
  if (totalRows   !== undefined) updates.total_rows = totalRows;
  if (successRows !== undefined) updates.success_rows = successRows;
  if (errorRows   !== undefined) updates.error_rows = errorRows;
  if (errorMessage!== undefined) updates.error_message = errorMessage;
  if (status === 'committed' || status === 'failed') updates.completed_at = new Date();
  await Import.update(updates, { where: { id } });
}

async function deleteById(id) {
  return Import.destroy({ where: { id } });
}

module.exports = { Import, findAll, findById, create, updateStatus, deleteById };
