'use strict';
// createPool() vs createConnection() karşılaştırması
const mysql = require('mysql2/promise');
const SOCKET = '/tmp/mysql.sock';
const OPTS = { socketPath: SOCKET, database: 'sporthink', user: 'root', password: 'rootroot' };

(async () => {
  // Test A: createConnection
  try {
    console.log('A) createConnection...');
    const c = await mysql.createConnection(OPTS);
    const [[r]] = await c.execute('SELECT 1 AS ok');
    await c.end();
    console.log('A) OK:', r.ok);
  } catch (e) { console.log('A) FAIL:', e.message); }

  // Test B: createPool — getConnection
  try {
    console.log('B) createPool.getConnection...');
    const p = mysql.createPool({ ...OPTS, connectionLimit: 2 });
    const conn = await p.getConnection();
    const [[r]] = await conn.execute('SELECT 2 AS ok');
    conn.release();
    await p.end();
    console.log('B) OK:', r.ok);
  } catch (e) { console.log('B) FAIL:', e.message); }

  // Test C: createPool — pool.execute (getConnection almadan)
  try {
    console.log('C) pool.execute direct...');
    const p2 = mysql.createPool({ ...OPTS, connectionLimit: 2 });
    const [[r]] = await p2.execute('SELECT 3 AS ok');
    await p2.end();
    console.log('C) OK:', r.ok);
  } catch (e) { console.log('C) FAIL:', e.message); }

  console.log('DONE');
  process.exit(0);
})();
