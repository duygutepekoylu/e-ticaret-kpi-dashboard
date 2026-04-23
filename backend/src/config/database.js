'use strict';

const mysql = require('mysql2/promise');
const env = require('./env');

// MySQL 9.x + mysql2: TCP bağlantısında ssl:false gerekli (packets out of order hatası).
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
  poolConfig.ssl = false;
}

const pool = mysql.createPool(poolConfig);

async function testConnection() {
  const conn = await pool.getConnection();
  await conn.ping();
  conn.release();
}

module.exports = { pool, testConnection };
