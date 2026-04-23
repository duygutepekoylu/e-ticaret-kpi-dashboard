'use strict';
process.chdir(__dirname);

// Tüm CSV kaynaklarını importer pipeline'ından geçirerek clean tablolara yazar.
// Raw tablolardaki seed verisi (import_id'siz) önce temizlenir.

const path = require('path');
const { parseCsv } = require('./src/importer/parsers/csvParser');
const { runImport } = require('./src/importer/importer');
const { pool } = require('./src/config/database');

const FIXTURES = path.join(__dirname, '../database/fixtures/raw');

const SOURCES = [
  { file: 'meta_ads.csv',     mapping: require('./src/importer/config/metaAdsMapping') },
  { file: 'google_ads.csv',   mapping: require('./src/importer/config/googleAdsMapping') },
];

// Raw tabloları temizle (seed verisi import_id olmadan yazılmıştı)
const RAW_TABLES = [
  'raw_ga4_traffic',
  'raw_ga4_item_interactions',
  'raw_meta_ads',
  'raw_meta_ads_breakdowns',
  'raw_google_ads',
];

async function cleanRawTables() {
  console.log('Raw tablolar temizleniyor...');
  for (const t of RAW_TABLES) {
    await pool.execute(`DELETE FROM \`${t}\``);
    console.log(`  ${t} temizlendi`);
  }
  // import_errors ve eski imports kayıtlarını da temizle
  await pool.execute(`DELETE FROM import_errors`);
  await pool.execute(`DELETE FROM imports`);
  console.log('  import_errors + imports temizlendi');
}

async function importSource({ file, mapping }) {
  const filePath = path.join(FIXTURES, file);
  console.log(`\n[${mapping.sourceName}] Okunuyor: ${file}`);

  const { rows, totalRows } = await parseCsv(filePath);
  console.log(`  ${rows.length} satır parse edildi (toplam dosyada: ${totalRows})`);

  // Admin kullanıcı id'sini al
  const [[userRow]] = await pool.execute('SELECT id FROM users WHERE role = "admin" LIMIT 1');

  const [insResult] = await pool.execute(
    `INSERT INTO imports (user_id, source_table, filename, file_type, status, started_at)
     VALUES (?, ?, ?, 'csv', 'pending', NOW())`,
    [userRow.id, mapping.cleanTable, file]
  );
  const importId = insResult.insertId;

  const result = await runImport({ rows, mapping, importId });
  console.log(`  ✅ import_id=${importId} | success=${result.successRows} | error=${result.errorRows} | status=${result.status}`);
  return result;
}

(async () => {
  console.log('=== BULK IMPORT BAŞLIYOR ===\n');

  // Raw tablolar zaten mysql CLI ile temizlendi
  const results = [];
  for (const source of SOURCES) {
    try {
      const r = await importSource(source);
      results.push({ source: source.mapping.sourceName, ...r });
    } catch (e) {
      console.error(`  ❌ HATA [${source.mapping.sourceName}]: ${e.message}`);
      results.push({ source: source.mapping.sourceName, error: e.message });
    }
  }

  console.log('\n=== ÖZET ===');
  for (const r of results) {
    if (r.error) {
      console.log(`  ${r.source}: ❌ ${r.error}`);
    } else {
      console.log(`  ${r.source}: ✅ ${r.successRows} satır`);
    }
  }

  // Final doğrulama
  console.log('\n=== TABLO SAYILARI ===');
  const tables = ['ga4_traffic', 'ga4_item_interactions', 'meta_ads', 'meta_ads_breakdowns', 'google_ads'];
  for (const t of tables) {
    const [[{ cnt }]] = await pool.execute(`SELECT COUNT(*) AS cnt FROM \`${t}\``);
    console.log(`  ${t}: ${cnt}`);
  }

  await pool.end();
  console.log('\n✅ Bulk import tamamlandı');
  process.exit(0);

})().catch(e => {
  console.error('\n❌ HATA:', e.message);
  console.error(e.stack);
  process.exit(1);
});
