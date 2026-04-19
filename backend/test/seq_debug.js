'use strict';
const fs = require('fs');
const LOG = '/tmp/seq_debug.txt';
const log = (msg) => fs.appendFileSync(LOG, msg + '\n');
fs.writeFileSync(LOG, '');

const { Sequelize } = require('sequelize');

async function trySeq(label, config) {
  log(`\n${label}`);
  const seq = new Sequelize('sporthink', 'root', 'rootroot', {
    dialect: 'mysql', logging: false,
    pool: { max: 1, min: 0, acquire: 4000, idle: 100 },
    ...config,
  });
  const timeout = new Promise((_, r) => setTimeout(() => r(new Error('TIMEOUT 4s')), 4500));
  try {
    await Promise.race([seq.authenticate(), timeout]);
    log(`${label} → PASS`);
    await seq.close().catch(() => {});
    return true;
  } catch (e) {
    log(`${label} → FAIL: ${e.message}`);
    try { await seq.close(); } catch {}
    return false;
  }
}

(async () => {
  // D6: host 127.0.0.1 (IPv4 zorla, TCP)
  await trySeq('D6) host: 127.0.0.1, port: 3306', {
    host: '127.0.0.1',
    port: 3306,
  });

  // D7: host localhost (karşılaştırma)
  await trySeq('D7) host: localhost, port: 3306', {
    host: 'localhost',
    port: 3306,
  });

  // D8: socketPath (referans — önceki sonuç)
  await trySeq('D8) dialectOptions.socketPath', {
    dialectOptions: { socketPath: '/tmp/mysql.sock' },
  });

  log('\nDONE');
  process.exit(0);
})();
