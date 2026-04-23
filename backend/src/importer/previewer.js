'use strict';

const path = require('path');
const { parseCsv } = require('./parsers/csvParser');
const { parseXlsx } = require('./parsers/xlsxParser');
const { parseJson } = require('./parsers/jsonParser');

const PREVIEW_LIMIT = 10;

/**
 * Dosyanın uzantısına göre doğru parser'ı seçer.
 * @param {string} filePath
 * @param {number} limit
 * @returns {Promise<{rows, totalRows, headers}>}
 */
async function parseFile(filePath, limit) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.csv':
      return parseCsv(filePath, { limit });
    case '.xlsx':
    case '.xls':
      return parseXlsx(filePath, { limit });
    case '.json':
      return parseJson(filePath, { limit });
    default:
      throw new Error(`Desteklenmeyen dosya formatı: "${ext}". Kabul edilen formatlar: .csv, .xlsx, .xls, .json`);
  }
}

/**
 * Dosyanın ilk PREVIEW_LIMIT satırını okur — DB'ye hiçbir şey YAZILMAz.
 *
 * Dönen yapı:
 * {
 *   headers: string[],          — sütun adları (CSV başlık satırından)
 *   rows: object[],             — ilk 10 kayıt
 *   totalRows: number,          — toplam satır sayısı (tahmini — tüm dosya okunmaz)
 *   fileFormat: string,         — 'csv' | 'xlsx' | 'json'
 *   mappingSuggestion: object[] — mapping config ile eşleşen sütun önerileri
 * }
 *
 * @param {string} filePath - Yüklenen dosyanın yerel yolu
 * @param {object} [mapping] - İsteğe bağlı mapping config (önerileri üretmek için)
 * @returns {Promise<object>}
 */
async function preview(filePath, mapping = null) {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const fileFormat = ext === 'xls' ? 'xlsx' : ext;

  const { rows, totalRows, headers } = await parseFile(filePath, PREVIEW_LIMIT);

  const result = {
    headers,
    rows,
    totalRows,
    fileFormat,
    mappingSuggestion: [],
  };

  if (mapping && mapping.columns) {
    result.mappingSuggestion = buildMappingSuggestion(headers, mapping.columns);
  }

  return result;
}

/**
 * CSV başlıklarını mapping config ile karşılaştırır, otomatik eşleşme önerir.
 * Tam eşleşme: csvCol === mapping.csv → matched: true
 * Eşleşmeme: matched: false, suggestion: null
 *
 * @param {string[]} headers - Dosyadaki sütun adları
 * @param {object[]} mappingColumns - Mapping config'deki columns dizisi
 * @returns {object[]}
 */
function buildMappingSuggestion(headers, mappingColumns) {
  const headerSet = new Set(headers);

  return mappingColumns.map((col) => ({
    csvColumn: col.csv,
    dbColumn: col.db,
    type: col.type,
    required: col.required,
    matched: headerSet.has(col.csv),
    foundInFile: headerSet.has(col.csv),
  }));
}

module.exports = { preview, parseFile, buildMappingSuggestion };
