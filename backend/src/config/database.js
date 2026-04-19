'use strict';

const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');
const env = require('./env');

// macOS Homebrew MySQL 9.x: TCP bağlantısında "packets out of order" hatası
// çözüm: socketPath kullan (production'da host:port çalışır)
const poolConfig = {
  database: env.db.name,
  user: env.db.user,
  password: env.db.password,
  connectionLimit: env.db.connectionLimit,
  timezone: '+00:00',
  decimalNumbers: true,
  waitForConnections: true,
  queueLimit: 0,
};
if (env.db.socket) {
  poolConfig.socketPath = env.db.socket;
} else {
  poolConfig.host = env.db.host;
  poolConfig.port = env.db.port;
}

const pool = mysql.createPool(poolConfig);

// Sequelize — ORM (users, imports, saved_views, segments, audit_logs, api_logs)
const sequelizeConfig = {
  dialect: 'mysql',
  logging: false,
  timezone: '+00:00',
  pool: { max: env.db.connectionLimit, min: 0, acquire: 30000, idle: 10000 },
};
if (env.db.socket) {
  sequelizeConfig.dialectOptions = { socketPath: env.db.socket };
} else {
  sequelizeConfig.host = env.db.host;
  sequelizeConfig.port = env.db.port;
}

const sequelize = new Sequelize(env.db.name, env.db.user, env.db.password, sequelizeConfig);

async function testConnection() {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
  await sequelize.authenticate();
}

module.exports = { pool, sequelize, testConnection };
