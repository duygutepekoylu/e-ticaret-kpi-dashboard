'use strict';

process.chdir(require('path').join(__dirname, '..'));
const mysql = require('mysql2/promise');

(async () => {
  // Socket bağlantısı dene
  try {
    const conn = await mysql.createConnection({
      socketPath: '/tmp/mysql.sock',
      database: 'sporthink',
      user: 'root',
      password: 'rootroot',
    });
    const [rows] = await conn.execute('SELECT 1 AS ok');
    console.log('SOCKET_OK:', rows[0].ok);
    await conn.end();
    process.exit(0);
  } catch (e) {
    console.error('SOCKET_FAIL:', e.message);
    process.exit(1);
  }
})();
