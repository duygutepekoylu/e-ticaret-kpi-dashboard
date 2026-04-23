'use strict';

/**
 * Tek bir satırı mapping config'e göre CSV sütun adlarından DB sütun adlarına çevirir.
 * Tanımlanmamış CSV sütunları çıktıya dahil edilmez.
 *
 * @param {object} row     - Transformer'dan geçmiş, CSV sütun adlı satır
 * @param {object} mapping - Mapping config (columns dizisi içermeli)
 * @returns {object}       - DB sütun adlı satır
 */
function mapRow(row, mapping) {
  const result = {};
  for (const col of mapping.columns) {
    const value = row[col.csv];
    // undefined ise null yaz — DB default değeri devreye girer
    result[col.db] = value !== undefined ? value : null;
  }
  return result;
}

/**
 * Tüm satırları toplu map eder.
 * @param {object[]} rows
 * @param {object} mapping
 * @returns {object[]}
 */
function mapRows(rows, mapping) {
  return rows.map((row) => mapRow(row, mapping));
}

/**
 * Ham CSV satırını raw tablo sütun adlarına eşler.
 * Raw tablolar CSV'nin orijinal başlıklarını tutar (GA4 camelCase, Google noktalı vb.).
 * Sadece mapping.rawColumns listesindeki sütunlar alınır.
 *
 * @param {object} row     - Parsed CSV satırı
 * @param {object} mapping - Mapping config (rawColumns dizisi içermeli)
 * @returns {object}       - Raw tablo için hazır satır
 */
function mapRawRow(row, mapping) {
  if (!mapping.rawColumns) return { ...row }; // rawTable yoksa (orders vb.) tüm satırı döndür
  const result = {};
  for (const col of mapping.rawColumns) {
    const value = row[col];
    result[col] = value !== undefined ? value : null;
  }
  return result;
}

/**
 * Tüm satırları raw tablo formatına çevirir.
 * @param {object[]} rows
 * @param {object} mapping
 * @returns {object[]}
 */
function mapRawRows(rows, mapping) {
  return rows.map((row) => mapRawRow(row, mapping));
}

module.exports = { mapRow, mapRows, mapRawRow, mapRawRows };
