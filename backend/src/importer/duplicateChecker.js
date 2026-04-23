'use strict';

const { pool } = require('../config/database');

/**
 * Belirtilen kaynak tablo için tarih aralığının daha önce yüklenip yüklenmediğini kontrol eder.
 * imports tablosundaki committed kayıtlara bakar.
 *
 * Strateji (data_mapping.md):
 * - ga4_traffic, meta_ads, google_ads, ga4_item_interactions, meta_ads_breakdowns
 *   → tarih aralığı kontrolü (date_range)
 * - orders, order_items → PK unique, duplicate checker gerekli değil
 * - products, customers, campaigns, channel_mapping → upsert, duplicate checker gerekli değil
 *
 * @param {string} sourceTable - imports.source_table değeri (örn: 'ga4_traffic')
 * @param {string} dateFrom    - YYYY-MM-DD
 * @param {string} dateTo      - YYYY-MM-DD
 * @returns {Promise<{isDuplicate: boolean, existingImports: object[]}>}
 */
async function checkDuplicate(sourceTable, dateFrom, dateTo) {
  if (!dateFrom || !dateTo) {
    return { isDuplicate: false, existingImports: [] };
  }

  // Aynı source_table ile örtüşen tarih aralığına sahip committed import var mı?
  // Örtüşme koşulu: mevcut aralık [A, B] ile yeni aralık [X, Y] örtüşür
  // eğer A <= Y AND B >= X
  const [rows] = await pool.execute(
    `SELECT id, filename, started_at, completed_at
     FROM imports
     WHERE source_table = ?
       AND status = 'committed'
       AND JSON_UNQUOTE(JSON_EXTRACT(error_message, '$.date_from')) <= ?
       AND JSON_UNQUOTE(JSON_EXTRACT(error_message, '$.date_to'))   >= ?
     LIMIT 5`,
    [sourceTable, dateTo, dateFrom]
  );

  // Fallback: error_message JSON olmayabilir — imports tablosunu tarih bilgisi olmadan kontrol et
  if (rows.length === 0) {
    const [simpleRows] = await pool.execute(
      `SELECT id, filename, started_at
       FROM imports
       WHERE source_table = ?
         AND status = 'committed'
       ORDER BY started_at DESC
       LIMIT 3`,
      [sourceTable]
    );
    // Basit kontrol: aynı kaynak için önceki committed import var mı?
    return {
      isDuplicate: simpleRows.length > 0,
      existingImports: simpleRows,
      warning: simpleRows.length > 0
        ? `"${sourceTable}" için daha önce yüklenmiş veri mevcut. Üzerine yazmak ister misiniz?`
        : null,
    };
  }

  return {
    isDuplicate: true,
    existingImports: rows,
    warning: `"${sourceTable}" tablosunda ${dateFrom} - ${dateTo} tarih aralığı daha önce yüklenmiş (import #${rows[0].id}). Üzerine yazmak ister misiniz?`,
  };
}

/**
 * Belirli bir tarih aralığının raw tabloda zaten mevcut olup olmadığını doğrudan kontrol eder.
 * @param {string} rawTable - Ham tablo adı (örn: 'raw_ga4_traffic')
 * @param {string} dateCol  - Tarih sütunu adı (raw tablodaki)
 * @param {string} dateFrom
 * @param {string} dateTo
 * @param {number} importId - Kontrol dışı tutulacak import ID (kendi kaydı)
 * @returns {Promise<number>} - Bulunan satır sayısı
 */
async function countExistingRawRows(rawTable, dateCol, dateFrom, dateTo, importId = null) {
  const params = [dateFrom, dateTo];
  let excludeClause = '';
  if (importId) {
    excludeClause = ' AND import_id != ?';
    params.push(importId);
  }

  const [[{ cnt }]] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM \`${rawTable}\`
     WHERE \`${dateCol}\` >= ? AND \`${dateCol}\` <= ?${excludeClause}`,
    params
  );
  return cnt;
}

module.exports = { checkDuplicate, countExistingRawRows };
