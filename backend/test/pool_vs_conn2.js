'use strict';
const fs = require('fs');
const LOG = '/tmp/pool_debug2.txt';
const log = (msg) => fs.appendFileSync(LOG, msg + '\n');

fs.writeFileSync(LOG, '');

const mysql = require('mysql2/promise');
const SOCKET = '/tmp/mysql.sock';
const BASE = { socketPath: SOCKET, database: 'sporthink', user: 'root', password: 'rootroot' };

(async () => {
  // A: createConnection
  log('A) createConnection start');
  try {
    const c = await mysql.createConnection(BASE);
    log('A) connected');
    const [[r]] = await c.execute('SELECT 1 AS ok');
    log('A) query OK: ' + r.ok);
    await c.end();
    log('A) PASS');
  } catch (e) { log('A) FAIL: ' + e.message); }

  // B: createPool.getConnection
  log('B) pool.getConnection start');
  try {
    const p = mysql.createPool({ ...BASE, connectionLimit: 2 });
    const conn = await p.getConnection();
    log('B) getConnection OK');
    const [[r]] = await conn.execute('SELECT 2 AS ok');
    log('B) query OK: ' + r.ok);
    conn.release();
    await p.end();
    log('B) PASS');
  } catch (e) { log('B) FAIL: ' + e.message); }

  // C: pool.execute (getConnection almadan)
  log('C) pool.execute start');
  try {
    const p2 = mysql.createPool({ ...BASE, connectionLimit: 2 });
    const [[r]] = await p2.execute('SELECT 3 AS ok');
    log('C) query OK: ' + r.ok);
    await p2.end();
    log('C) PASS');
  } catch (e) { log('C) FAIL: ' + e.message); }

  // D: Sequelize + socketPath
  log('D) Sequelize authenticate start');
  try {
    const { Sequelize } = require('sequelize');
    const seq = new Sequelize('sporthink', 'root', 'rootroot', {
      dialect: 'mysql', logging: false,
      dialectOptions: { socketPath: SOCKET },
      pool: { max: 1, min: 0, acquire: 5000, idle: 100 },
    });
    await seq.authenticate();
    log('D) PASS');
    await seq.close();
  } catch (e) { log('D) FAIL: ' + e.message); }

  log('DONE');
  process.exit(0);
})();
