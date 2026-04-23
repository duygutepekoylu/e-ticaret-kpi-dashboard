'use strict';

const fs = require('fs');
const { parse } = require('csv-parse');

/**
 * CSV dosyasını satır satır okur ve kayıt dizisi döndürür.
 * @param {string} filePath - Okunacak CSV dosyasının yolu
 * @param {object} options
 * @param {number} [options.limit]     - Maksimum satır sayısı (previewer için 10)
 * @param {boolean} [options.columns]  - true: başlık satırını sütun adı olarak kullan
 * @returns {Promise<{rows: object[], totalRows: number, headers: string[]}>}
 */
async function parseCsv(filePath, { limit = Infinity, columns = true } = {}) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`CSV dosyası bulunamadı: ${filePath}`));
    }

    const rows = [];
    let headers = [];
    let totalRows = 0;
    let resolved = false;

    const fileStream = fs.createReadStream(filePath);

    const parser = parse({
      columns,
      skip_empty_lines: true,
      trim: true,
      relax_quotes: true,
      relax_column_count: true,
      bom: true, // UTF-8 BOM karakterini otomatik temizler
    });

    function finish() {
      if (!resolved) {
        resolved = true;
        resolve({ rows, totalRows, headers });
      }
    }

    parser.on('readable', () => {
      let record;
      while ((record = parser.read()) !== null) {
        if (totalRows === 0 && columns && typeof record === 'object') {
          headers = Object.keys(record);
        }
        totalRows++;
        if (rows.length < limit) {
          rows.push(record);
        }
        // Limit dolunca stream'i kes — dosyanın geri kalanını okuma
        if (limit !== Infinity && rows.length >= limit) {
          fileStream.destroy();
          finish();
          return;
        }
      }
    });

    parser.on('error', (err) => {
      if (!resolved) reject(new Error(`CSV parse hatası: ${err.message}`));
    });

    parser.on('end', finish);

    // Stream destroy edilince parser kapanabilir — error'ı yut
    fileStream.on('error', (err) => {
      if (err.code !== 'ERR_STREAM_DESTROYED' && !resolved) {
        reject(new Error(`Dosya okuma hatası: ${err.message}`));
      }
    });

    fileStream.pipe(parser);
  });
}

/**
 * CSV dosyasından sadece başlık satırını okur.
 * @param {string} filePath
 * @returns {Promise<string[]>}
 */
async function getCsvHeaders(filePath) {
  const { headers } = await parseCsv(filePath, { limit: 1 });
  return headers;
}

module.exports = { parseCsv, getCsvHeaders };
