'use strict';

const fs = require('fs');
const XLSX = require('xlsx');

/**
 * XLSX/XLS dosyasını okur, ilk sheet'i kayıt dizisine çevirir.
 * @param {string} filePath - Okunacak XLSX dosyasının yolu
 * @param {object} options
 * @param {number} [options.limit]      - Maksimum satır sayısı (previewer için 10)
 * @param {string} [options.sheetName]  - Sheet adı — belirtilmezse ilk sheet
 * @returns {Promise<{rows: object[], totalRows: number, headers: string[]}>}
 */
async function parseXlsx(filePath, { limit = Infinity, sheetName = null } = {}) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`XLSX dosyası bulunamadı: ${filePath}`);
  }

  let workbook;
  try {
    workbook = XLSX.readFile(filePath, { cellDates: true, dense: false });
  } catch (err) {
    throw new Error(`XLSX okuma hatası: ${err.message}`);
  }

  const targetSheet = sheetName || workbook.SheetNames[0];
  if (!workbook.Sheets[targetSheet]) {
    throw new Error(`Sheet bulunamadı: "${targetSheet}". Mevcut sheet'ler: ${workbook.SheetNames.join(', ')}`);
  }

  const sheet = workbook.Sheets[targetSheet];

  // header: 1 → ilk satırı başlık olarak kullan, her satır { başlık: değer } objesi olur
  const allRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });

  if (allRows.length === 0) {
    return { rows: [], totalRows: 0, headers: [] };
  }

  const headers = (allRows[0] || []).map((h) => (h !== null ? String(h).trim() : ''));
  const dataRows = allRows.slice(1);
  const totalRows = dataRows.length;

  const limitedRows = (limit === Infinity ? dataRows : dataRows.slice(0, limit)).map((row) => {
    const obj = {};
    headers.forEach((header, i) => {
      if (header) obj[header] = row[i] !== undefined ? row[i] : null;
    });
    return obj;
  });

  return { rows: limitedRows, totalRows, headers };
}

/**
 * XLSX dosyasından sadece başlık satırını okur.
 * @param {string} filePath
 * @returns {Promise<string[]>}
 */
async function getXlsxHeaders(filePath) {
  const { headers } = await parseXlsx(filePath, { limit: 1 });
  return headers;
}

module.exports = { parseXlsx, getXlsxHeaders };
