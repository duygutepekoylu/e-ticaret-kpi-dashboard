'use strict';
const fs = require('fs');
const LOG = '/tmp/tc_debug.txt';
fs.writeFileSync(LOG, '');
const log = (msg) => { fs.appendFileSync(LOG, `[${Date.now()}] ${msg}\n`); console.log(msg); };

// Aynı env ve config yüklemesini yap
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

log('1) env yüklendi');

const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');

log('2) require tamamlandı');

const socket = process.env.DB_SOCKET;
const name   = process.env.DB_NAME;
const user   = process.env.DB_USER;
const pass   = process.env.DB_PASSWORD;
const host   = process.env.DB_HOST;
const port   = Number(process.env.DB_PORT) || 3306;

log(`3) socket=${socket} name=${name} user=${user} host=${host} port=${port}`);

// --- Pool ---
const poolConfig = { database: name, user, password: pass, connectionLimit: 2, timezone: '+00:00', decimalNumbers: true, waitForConnections: true, queueLimit: 0 };
if (socket) poolConfig.socketPath = socket; else { poolConfig.host = host; poolConfig.port = port; }

log('4) pool oluşturuluyor...');
const pool = mysql.createPool(poolConfig);
log('5) pool oluşturuldu');

// --- Sequelize ---
const seqCfg = { dialect: 'mysql', logging: false, timezone: '+00:00', pool: { max: 2, min: 0, acquire: 10000, idle: 1000 } };
if (socket) { seqCfg.host = null; seqCfg.dialectOptions = { socketPath: socket }; }
else { seqCfg.host = host; seqCfg.port = port; }

log('6) Sequelize oluşturuluyor...');
const sequelize = new Sequelize(name, user, pass, seqCfg);
log('7) Sequelize oluşturuldu');

(async () => {
  log('8) pool.getConnection başlıyor...');
  let conn;
  try {
    conn = await pool.getConnection();
    log('9) pool.getConnection OK');
    await conn.ping();
    log('10) ping OK');
    conn.release();
    log('11) conn.release OK');
  } catch (e) {
    log(`FAIL pool: ${e.message}`);
  }

  log('12) sequelize.authenticate başlıyor...');
  try {
    await sequelize.authenticate();
    log('13) sequelize.authenticate OK');
  } catch (e) {
    log(`FAIL sequelize: ${e.message}`);
  }

  log('14) DONE');
  await pool.end().catch(() => {});
  await sequelize.close().catch(() => {});
  process.exit(0);
})();
