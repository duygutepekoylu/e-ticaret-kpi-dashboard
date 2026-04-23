'use strict';
process.chdir(__dirname);

const { transformGa4Date, transformMetaCtr, transformGoogleMicros } = require('./src/importer/transformer');
const { mapRow } = require('./src/importer/mapper');
const ga4Mapping = require('./src/importer/config/ga4TrafficMapping');
const googleMapping = require('./src/importer/config/googleAdsMapping');

// ── Birim testleri (DB gerektirmez) ──────────────────────────────────────────
console.log('=== TRANSFORMER TESTLERİ ===');
console.log('GA4 date 20241001 → 2024-10-01:', transformGa4Date(20241001) === '2024-10-01' ? '✅' : '❌ ' + transformGa4Date(20241001));
console.log('Meta CTR 2.25 → 0.0225:', transformMetaCtr('2.25') === 0.0225 ? '✅' : '❌ ' + transformMetaCtr('2.25'));
console.log('Google micros 2800000000 → 2800:', transformGoogleMicros(2800000000) === 2800 ? '✅' : '❌ ' + transformGoogleMicros(2800000000));

console.log('\n=== MAPPER TESTLERİ ===');
const ga4Row = { date: '2024-10-01', sessionSource: 'google', sessionMedium: 'cpc', sessions: 1500 };
const mapped = mapRow(ga4Row, ga4Mapping);
console.log('GA4 sessionSource → session_source:', mapped.session_source === 'google' ? '✅' : '❌ ' + mapped.session_source);
const gRow = { 'segments.date': '2024-10-01', 'campaign.name': 'Test' };
const gMapped = mapRow(gRow, googleMapping);
console.log('Google segments.date → date:', gMapped.date === '2024-10-01' ? '✅' : '❌ ' + gMapped.date);

// ── DB gerektiren testler ────────────────────────────────────────────────────
const { runImport, rollbackImport } = require('./src/importer/importer');
const { checkDuplicate } = require('./src/importer/duplicateChecker');
const { pool } = require('./src/config/database');

// Inline test satırları — CSV parse edilmez (macOS socket timeout sorununu önler)
const TEST_ROWS = [
  { date: '20241001', sessionSource: 'google', sessionMedium: 'cpc', sessionCampaignName: 'Black Friday', sessionDefaultChannelGroup: 'Paid Search', deviceCategory: 'desktop', city: 'Istanbul', landingPagePlusQueryString: '/landing', newVsReturning: 'new', sessions: '1200', totalUsers: '1100', newUsers: '900', bounceRate: '0.35', averageSessionDuration: '125.5', screenPageViewsPerSession: '3.2', engagedSessions: '780', engagementRate: '0.65', userEngagementDuration: '98000', conversions: '45', purchaseRevenue: '12500.00', transactions: '40' },
  { date: '20241002', sessionSource: 'facebook', sessionMedium: 'cpc', sessionCampaignName: 'Summer Sale', sessionDefaultChannelGroup: 'Paid Social', deviceCategory: 'mobile', city: 'Ankara', landingPagePlusQueryString: '/promo', newVsReturning: 'returning', sessions: '850', totalUsers: '800', newUsers: '200', bounceRate: '0.42', averageSessionDuration: '95.0', screenPageViewsPerSession: '2.8', engagedSessions: '490', engagementRate: '0.58', userEngagementDuration: '80750', conversions: '28', purchaseRevenue: '7800.00', transactions: '25' },
  { date: '20241003', sessionSource: 'google', sessionMedium: 'organic', sessionCampaignName: null, sessionDefaultChannelGroup: 'Organic Search', deviceCategory: 'desktop', city: 'Izmir', landingPagePlusQueryString: '/home', newVsReturning: 'new', sessions: '2100', totalUsers: '2000', newUsers: '1800', bounceRate: '0.28', averageSessionDuration: '145.0', screenPageViewsPerSession: '4.1', engagedSessions: '1512', engagementRate: '0.72', userEngagementDuration: '304500', conversions: '92', purchaseRevenue: '28000.00', transactions: '85' },
  { date: '20241004', sessionSource: 'direct', sessionMedium: '(none)', sessionCampaignName: null, sessionDefaultChannelGroup: 'Direct', deviceCategory: 'tablet', city: 'Bursa', landingPagePlusQueryString: '/cart', newVsReturning: 'returning', sessions: '430', totalUsers: '420', newUsers: '50', bounceRate: '0.18', averageSessionDuration: '210.0', screenPageViewsPerSession: '5.5', engagedSessions: '353', engagementRate: '0.82', userEngagementDuration: '90300', conversions: '38', purchaseRevenue: '11200.00', transactions: '36' },
  { date: '20241005', sessionSource: 'email', sessionMedium: 'newsletter', sessionCampaignName: 'Weekly Digest', sessionDefaultChannelGroup: 'Email', deviceCategory: 'mobile', city: 'Antalya', landingPagePlusQueryString: '/new-arrivals', newVsReturning: 'new', sessions: '640', totalUsers: '610', newUsers: '580', bounceRate: '0.31', averageSessionDuration: '118.0', screenPageViewsPerSession: '3.6', engagedSessions: '442', engagementRate: '0.69', userEngagementDuration: '75520', conversions: '22', purchaseRevenue: '6100.00', transactions: '20' },
];

(async () => {
  console.log('\n=== IMPORTER DB TESTLERİ ===');
  console.log('Test satırları:', TEST_ROWS.length, '(inline — CSV parse yok)');

  // Import kaydı oluştur — mysql2 pool ile (Sequelize bypass)
  const [[userRow]] = await pool.execute('SELECT id FROM users WHERE role = "admin" LIMIT 1');
  const [insResult] = await pool.execute(
    `INSERT INTO imports (user_id, source_table, filename, file_type, status, started_at)
     VALUES (?, 'ga4_traffic', 'ga4_traffic_test.csv', 'csv', 'pending', NOW())`,
    [userRow.id]
  );
  const importId = insResult.insertId;
  console.log('Import kaydı oluştu, ID:', importId);

  // Import çalıştır
  console.log('Import başlıyor...');
  const result = await runImport({ rows: TEST_ROWS, mapping: ga4Mapping, importId });
  console.log('Import tamamlandı:', JSON.stringify(result));

  // Doğrulama
  const [[{ cleanCnt }]] = await pool.execute('SELECT COUNT(*) AS cleanCnt FROM ga4_traffic');
  const [[{ rawCnt }]] = await pool.execute(
    'SELECT COUNT(*) AS rawCnt FROM raw_ga4_traffic WHERE import_id = ?', [importId]
  );
  console.log('ga4_traffic (clean) satır sayısı:', cleanCnt, Number(cleanCnt) >= result.successRows ? '✅' : '❌');
  console.log('raw_ga4_traffic (bu import) satır sayısı:', rawCnt, Number(rawCnt) === result.successRows ? '✅' : '❌');

  const [[imp]] = await pool.execute('SELECT * FROM imports WHERE id = ?', [importId]);
  console.log('imports.status:', imp.status, imp.status === 'committed' ? '✅' : '❌');
  console.log('imports.success_rows:', imp.success_rows, Number(imp.success_rows) === result.successRows ? '✅' : '❌');
  console.log('imports.error_rows:', imp.error_rows);

  // Duplicate checker
  const dupResult = await checkDuplicate('ga4_traffic', '2024-10-01', '2024-10-31');
  console.log('\n=== DUPLICATE CHECKER ===');
  console.log('Duplicate var mı (beklenti: true):', dupResult.isDuplicate ? '✅' : '❌');
  console.log('Uyarı mesajı:', dupResult.warning ? '✅ ' + dupResult.warning.slice(0, 60) + '...' : '❌ yok');

  // Rollback testi
  console.log('\n=== ROLLBACK TESTİ ===');
  await rollbackImport(importId, ga4Mapping);
  const [[{ afterRollback }]] = await pool.execute(
    'SELECT COUNT(*) AS afterRollback FROM raw_ga4_traffic WHERE import_id = ?', [importId]
  );
  const [[impAfter]] = await pool.execute('SELECT * FROM imports WHERE id = ?', [importId]);
  console.log('raw_ga4_traffic rollback sonrası (bu import):', Number(afterRollback), Number(afterRollback) === 0 ? '✅' : '❌');
  console.log('imports.status:', impAfter.status, impAfter.status === 'rolled_back' ? '✅' : '❌');

  await pool.end();
  console.log('\n✅ Tüm testler tamamlandı');
  process.exit(0);

})().catch(e => {
  console.error('\n❌ TEST HATASI:', e.message);
  console.error(e.stack);
  process.exit(1);
});
