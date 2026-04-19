'use strict';
// Her adımı bağımsız timeout ile test eder — hangisi takıldığını gösterir
process.chdir(require('path').join(__dirname, '..'));

const TIMEOUT_MS = 4000;

function withTimeout(promise, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`TIMEOUT (${TIMEOUT_MS}ms)`)), TIMEOUT_MS)
    ),
  ]).then(
    (r) => { console.log(`  ✅ ${label}`); return r; },
    (e) => { console.log(`  ❌ ${label}: ${e.message}`); return null; }
  );
}

(async () => {
  const env = require('../src/config/env');
  console.log('\n=== Bağlantı Debug ===');
  console.log('DB_SOCKET:', env.db.socket);
  console.log('DB_HOST:', env.db.host, 'PORT:', env.db.port);
  console.log('DB_NAME:', env.db.name, 'USER:', env.db.user);

  // --- TEST 1: mysql2 pool (socket) ---
  console.log('\n1. mysql2 pool.getConnection()');
  const mysql = require('mysql2/promise');
  const pool = mysql.createPool({
    socketPath: env.db.socket,
    database: env.db.name,
    user: env.db.user,
    password: env.db.password,
    connectionLimit: 2,
    decimalNumbers: true,
  });
  const conn = await withTimeout(pool.getConnection(), 'pool.getConnection()');
  if (conn) {
    await withTimeout(conn.ping(), 'conn.ping()');
    conn.release();
    await withTimeout(pool.end(), 'pool.end()');
  }

  // --- TEST 2: Sequelize (dialectOptions.socketPath) ---
  console.log('\n2. Sequelize authenticate()');
  const { Sequelize } = require('sequelize');
  const seq = new Sequelize(env.db.name, env.db.user, env.db.password, {
    dialect: 'mysql',
    logging: false,
    timezone: '+00:00',
    dialectOptions: { socketPath: env.db.socket },
    pool: { max: 2, min: 0, acquire: TIMEOUT_MS, idle: 1000 },
  });
  await withTimeout(seq.authenticate(), 'sequelize.authenticate()');
  await withTimeout(seq.close(), 'sequelize.close()');

  // --- TEST 3: Sequelize (host ile, karşılaştırma için) ---
  console.log('\n3. Sequelize TCP (host:port, karşılaştırma — başarısız bekleniyor)');
  const seq2 = new Sequelize(env.db.name, env.db.user, env.db.password, {
    dialect: 'mysql',
    host: env.db.host,
    port: env.db.port,
    logging: false,
    pool: { max: 1, min: 0, acquire: TIMEOUT_MS, idle: 100 },
  });
  await withTimeout(seq2.authenticate(), 'sequelize TCP authenticate()');
  await seq2.close().catch(() => {});

  console.log('\n=== Debug tamamlandı ===\n');
  process.exit(0);
})();
