'use strict';

// Tarih formatı kontrolü için basit regex'ler
const DATE_PATTERN     = /^\d{4}-\d{2}-\d{2}$/;                      // YYYY-MM-DD
const DATETIME_PATTERN = /^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/; // YYYY-MM-DD [HH:MM[:SS]]

/**
 * Tek bir satırın tip kontrolünü yapar.
 * @param {*} value
 * @param {string} type - 'string' | 'int' | 'decimal' | 'date' | 'datetime'
 * @returns {boolean}
 */
function isValidType(value, type) {
  if (value === null || value === undefined || value === '') return true; // zorunlu alan kontrolü ayrıca yapılır

  switch (type) {
    case 'int':
      return Number.isInteger(Number(value)) && !isNaN(Number(value));
    case 'decimal':
      return !isNaN(parseFloat(value)) && isFinite(value);
    case 'date':
      // GA4: 20241001 (int) veya 2024-10-01 (string) — her ikisi de geçerli
      if (/^\d{8}$/.test(String(value))) return true;
      return DATE_PATTERN.test(String(value));
    case 'datetime':
      return DATETIME_PATTERN.test(String(value));
    case 'string':
    default:
      return true;
  }
}

/**
 * Tek bir satırı mapping config'e göre validate eder.
 * @param {object} row       - Parsed CSV satırı { csvColumn: value }
 * @param {object} mapping   - Mapping config (columns, requiredFields)
 * @param {number} rowIndex  - Satır numarası (hata mesajı için)
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateRow(row, mapping, rowIndex) {
  const errors = [];
  const { columns, requiredFields = [] } = mapping;

  // DB sütun adına göre değer lookup yap
  const dbValueMap = {};
  for (const col of columns) {
    const rawValue = row[col.csv];
    const value = rawValue !== undefined ? rawValue : null;
    dbValueMap[col.db] = value;

    // Tip kontrolü — null/undefined geçerli (zorunlu alan kontrolü ayrıca)
    if (value !== null && value !== undefined && value !== '') {
      if (!isValidType(value, col.type)) {
        errors.push(
          `Satır ${rowIndex}: "${col.csv}" alanı "${col.type}" tipinde olmalı, gelen değer: "${value}"`
        );
      }
    }
  }

  // Zorunlu alan kontrolü
  for (const field of requiredFields) {
    const value = dbValueMap[field];
    if (value === null || value === undefined || value === '') {
      errors.push(`Satır ${rowIndex}: Zorunlu alan eksik: "${field}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Tüm satırları validate eder.
 * Import durdurmaz — hatalı satırlar raporlanır, geçerliler devam eder.
 *
 * @param {object[]} rows    - Parse edilmiş satır listesi
 * @param {object} mapping   - Mapping config
 * @param {object} [options]
 * @param {number} [options.rowOffset] - Satır numarası offset'i (header satırı için +1)
 * @returns {{
 *   validRows: object[],
 *   invalidRows: { rowIndex: number, row: object, errors: string[] }[],
 *   totalRows: number,
 *   errorCount: number
 * }}
 */
function validateRows(rows, mapping, { rowOffset = 2 } = {}) {
  const validRows = [];
  const invalidRows = [];

  for (let i = 0; i < rows.length; i++) {
    const rowIndex = i + rowOffset;
    const { valid, errors } = validateRow(rows[i], mapping, rowIndex);
    if (valid) {
      validRows.push(rows[i]);
    } else {
      invalidRows.push({ rowIndex, row: rows[i], errors });
    }
  }

  return {
    validRows,
    invalidRows,
    totalRows: rows.length,
    errorCount: invalidRows.length,
  };
}

/**
 * Mapping config'deki tüm CSV sütunlarının dosya başlıklarında var olup olmadığını kontrol eder.
 * Eksik zorunlu sütun varsa içe aktarma başlamadan hata verir.
 *
 * @param {string[]} fileHeaders   - Dosyadaki sütun adları
 * @param {object} mapping         - Mapping config
 * @returns {{ valid: boolean, missingRequired: string[], missingOptional: string[] }}
 */
function validateHeaders(fileHeaders, mapping) {
  const headerSet = new Set(fileHeaders);
  const missingRequired = [];
  const missingOptional = [];

  for (const col of mapping.columns) {
    if (!headerSet.has(col.csv)) {
      if (col.required) {
        missingRequired.push(col.csv);
      } else {
        missingOptional.push(col.csv);
      }
    }
  }

  return {
    valid: missingRequired.length === 0,
    missingRequired,
    missingOptional,
  };
}

module.exports = { validateRow, validateRows, validateHeaders, isValidType };
