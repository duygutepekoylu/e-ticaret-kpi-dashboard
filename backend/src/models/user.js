'use strict';

const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id:             { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  email:          { type: DataTypes.STRING(255), allowNull: false, unique: true },
  password_hash:  { type: DataTypes.STRING(255), allowNull: false },
  full_name:      { type: DataTypes.STRING(255), allowNull: false },
  role:           { type: DataTypes.ENUM('admin', 'marketing', 'viewer'), allowNull: false, defaultValue: 'viewer' },
  is_active:      { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  last_login_at:  { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

async function findAll({ page = 1, limit = 20 } = {}) {
  const offset = (page - 1) * limit;
  const { rows, count } = await User.findAndCountAll({
    attributes: { exclude: ['password_hash'] },
    limit,
    offset,
    order: [['created_at', 'DESC']],
  });
  return { rows, total: count };
}

async function findById(id) {
  return User.findByPk(id, { attributes: { exclude: ['password_hash'] } });
}

async function findByEmail(email) {
  return User.findOne({ where: { email } });
}

async function create({ email, passwordHash, fullName, role = 'viewer' }) {
  const user = await User.create({ email, password_hash: passwordHash, full_name: fullName, role });
  return user.id;
}

async function updateLastLogin(id) {
  await User.update({ last_login_at: new Date() }, { where: { id } });
}

async function update(id, data) {
  const allowed = {};
  if (data.fullName  !== undefined) allowed.full_name = data.fullName;
  if (data.role      !== undefined) allowed.role = data.role;
  if (data.isActive  !== undefined) allowed.is_active = data.isActive ? 1 : 0;
  if (!Object.keys(allowed).length) return;
  await User.update(allowed, { where: { id } });
}

module.exports = { User, findAll, findById, findByEmail, create, updateLastLogin, update };
