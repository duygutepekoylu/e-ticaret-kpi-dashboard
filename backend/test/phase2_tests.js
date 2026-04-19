'use strict';

// Faz 2 test scripti — tüm kriterleri çalıştırır
process.chdir(require('path').join(__dirname, '..'));

const http = require('http');
const jwt = require('jsonwebtoken');
const env = require('../src/config/env');
const { testConnection, pool, sequelize } = require('../src/config/database');

let passed = 0;
let failed = 0;

function ok(label, value) {
  if (value) { console.log(`  ✅ ${label}`); passed++; }
  else        { console.log(`  ❌ ${label}`); failed++; }
}

function request(method, path, token) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'localhost', port: env.app.port, path, method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    };
    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body) }); }
        catch { resolve({ status: res.statusCode, body }); }
      });
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.end();
  });
}

async function runTests() {
  console.log('\n══════════════════════════════════════════');
  console.log('  FAZ 2 TEST KRİTERLERİ');
  console.log('══════════════════════════════════════════\n');

  // ----------------------------------------------------------------
  // TEST 1: DB bağlantısı
  // ----------------------------------------------------------------
  console.log('1️⃣  Veritabanı Bağlantısı');
  try {
    await testConnection();
    ok('mysql2 pool bağlantısı (socket)', true);
    ok('Sequelize authenticate', true);
  } catch (e) {
    ok(`DB bağlantısı (${e.message})`, false);
  }

  // ----------------------------------------------------------------
  // TEST 2: /health endpoint
  // ----------------------------------------------------------------
  console.log('\n2️⃣  GET /health');
  const health = await request('GET', '/health');
  ok('status 200', health.status === 200);
  ok('success: true', health.body?.success === true);
  ok('db: connected', health.body?.data?.db === 'connected');

  // ----------------------------------------------------------------
  // TEST 3: JWT — geçersiz token → 401
  // ----------------------------------------------------------------
  console.log('\n3️⃣  JWT Testi — geçersiz token → 401');
  const r401 = await request('GET', '/api/v1/me', 'INVALID_TOKEN_XYZ');
  ok('status 401', r401.status === 401);
  ok('success: false', r401.body?.success === false);
  ok('code: INVALID_TOKEN', r401.body?.error?.code === 'INVALID_TOKEN');

  // ----------------------------------------------------------------
  // TEST 4: JWT — token yok → 401
  // ----------------------------------------------------------------
  console.log('\n4️⃣  JWT Testi — token yok → 401');
  const rNoToken = await request('GET', '/api/v1/me');
  ok('status 401', rNoToken.status === 401);
  ok('code: UNAUTHORIZED', rNoToken.body?.error?.code === 'UNAUTHORIZED');

  // ----------------------------------------------------------------
  // TEST 5: Rol testi — viewer token ile admin endpoint → 403
  // ----------------------------------------------------------------
  console.log('\n5️⃣  Rol Testi — viewer token → admin endpoint → 403');
  const viewerToken = jwt.sign({ id: 99, email: 'viewer@test.com', role: 'viewer' }, env.jwt.secret, { expiresIn: '1m' });
  const r403 = await request('GET', '/api/v1/admin-test', viewerToken);
  ok('status 403', r403.status === 403);
  ok('code: FORBIDDEN', r403.body?.error?.code === 'FORBIDDEN');

  // ----------------------------------------------------------------
  // TEST 6: Admin token ile admin endpoint → 200
  // ----------------------------------------------------------------
  console.log('\n6️⃣  Rol Testi — admin token → admin endpoint → 200');
  const adminToken = jwt.sign({ id: 1, email: 'admin@test.com', role: 'admin' }, env.jwt.secret, { expiresIn: '1m' });
  const r200 = await request('GET', '/api/v1/admin-test', adminToken);
  ok('status 200', r200.status === 200);
  ok('success: true', r200.body?.success === true);

  // ----------------------------------------------------------------
  // TEST 7: 404 — olmayan route → { success: false, error: { code, message } }
  // ----------------------------------------------------------------
  console.log('\n7️⃣  Error Handler — olmayan route → 404');
  const r404 = await request('GET', '/api/v1/nonexistent-route-xyz', adminToken);
  ok('status 404', r404.status === 404);
  ok('success: false', r404.body?.success === false);
  ok('error.code mevcut', !!r404.body?.error?.code);
  ok('error.message mevcut', !!r404.body?.error?.message);

  // ----------------------------------------------------------------
  // TEST 8: Her model için SELECT sorgusu
  // ----------------------------------------------------------------
  console.log('\n8️⃣  Model Testleri — SELECT sorguları');

  const models = [
    { name: 'user',              fn: () => require('../src/models/user').findAll({ limit: 1 }) },
    { name: 'import',            fn: () => require('../src/models/import').findAll({ limit: 1 }) },
    { name: 'product',           fn: () => require('../src/models/product').findAll({ limit: 1 }) },
    { name: 'customer',          fn: () => require('../src/models/customer').findAll({ limit: 1 }) },
    { name: 'campaign',          fn: () => require('../src/models/campaign').findAll({ limit: 1 }) },
    { name: 'order',             fn: () => require('../src/models/order').findAll({ limit: 1 }) },
    { name: 'orderItem',         fn: () => require('../src/models/orderItem').findAll({ limit: 1 }) },
    { name: 'ga4Traffic',        fn: () => require('../src/models/ga4Traffic').findRaw({ limit: 1 }) },
    { name: 'ga4ItemInteraction',fn: () => require('../src/models/ga4ItemInteraction').findRaw({ limit: 1 }) },
    { name: 'metaAds',           fn: () => require('../src/models/metaAds').findRaw({ limit: 1 }) },
    { name: 'googleAds',         fn: () => require('../src/models/googleAds').findRaw({ limit: 1 }) },
  ];

  for (const m of models) {
    try {
      const result = await m.fn();
      const hasRows = Array.isArray(result?.rows) && result.rows !== undefined;
      ok(`${m.name}.findAll/findRaw çalıştı`, hasRows);
    } catch (e) {
      ok(`${m.name} (${e.message})`, false);
    }
  }

  // ----------------------------------------------------------------
  // TEST 9: Request logger — api_logs tablosuna kayıt
  // ----------------------------------------------------------------
  console.log('\n9️⃣  Request Logger — api_logs tablosuna kayıt');
  // /health isteğinden önce sayı al
  const [[{ before }]] = await pool.execute('SELECT COUNT(*) AS before FROM api_logs');
  await request('GET', '/health');
  await new Promise(r => setTimeout(r, 300)); // logger async, kısa bekle
  const [[{ after }]] = await pool.execute('SELECT COUNT(*) AS after FROM api_logs');
  ok('api_logs kaydı arttı', after > before);

  // ----------------------------------------------------------------
  // SONUÇ
  // ----------------------------------------------------------------
  console.log('\n══════════════════════════════════════════');
  console.log(`  SONUÇ: ${passed} geçti / ${failed} başarısız`);
  console.log('══════════════════════════════════════════\n');

  await pool.end();
  await sequelize.close();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(e => { console.error('Test hatası:', e.message); process.exit(1); });
