'use strict';

const fs = require('fs');

/**
 * JSON dosyasını okur. Root seviyesinde array beklenir.
 * @param {string} filePath - Okunacak JSON dosyasının yolu
 * @param {object} options
 * @param {number} [options.limit] - Maksimum satır sayısı (previewer için 10)
 * @returns {Promise<{rows: object[], totalRows: number, headers: string[]}>}
 */
async function parseJson(filePath, { limit = Infinity } = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`JSON dosyası bulunamadı: ${filePath}`);
  }

  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`JSON okuma hatası: ${err.message}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error(`JSON parse hatası (geçersiz JSON formatı): ${err.message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('JSON formatı hatalı: root seviyesinde array bekleniyor, obje veya başka bir tip geldi');
  }

  if (parsed.length === 0) {
    return { rows: [], totalRows: 0, headers: [] };
  }

  const totalRows = parsed.length;

  // Başlıkları ilk kayıttan çıkar
  const firstRecord = parsed[0];
  if (typeof firstRecord !== 'object' || Array.isArray(firstRecord) || firstRecord === null) {
    throw new Error('JSON formatı hatalı: array içindeki elemanlar obje olmalı');
  }

  const headers = Object.keys(firstRecord);
  const rows = limit === Infinity ? parsed : parsed.slice(0, limit);

  return { rows, totalRows, headers };
}

/**
 * JSON dosyasından sadece başlık (key) listesini okur.
 * @param {string} filePath
 * @returns {Promise<string[]>}
 */
async function getJsonHeaders(filePath) {
  const { headers } = await parseJson(filePath, { limit: 1 });
  return headers;
}

module.exports = { parseJson, getJsonHeaders };
