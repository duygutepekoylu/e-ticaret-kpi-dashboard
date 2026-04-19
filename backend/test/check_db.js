'use strict';

process.chdir(require('path').join(__dirname, '..'));
const { testConnection } = require('../src/config/database');

(async () => {
  try {
    await testConnection();
    console.log('DB_OK');
  } catch (e) {
    console.error('DB_FAIL:', e.message);
  } finally {
    process.exit(0);
  }
})();
