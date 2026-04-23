'use strict';

const { pool } = require('../config/database');
const { transformRows } = require('./transformer');
const { mapRows, mapRawRows } = require('./mapper');
const { validateRows } = require('./validator');

const BATCH_SIZE = 500; // tek seferde kaç satır INSERT edileceği

// ─── Yardımcı: çok satırlı INSERT ────────────────────────────────────────────

/**
 * rows dizisini BATCH_SIZE kadar parçalara bölerek toplu INSERT yapar.
 * Transaction içinde çağrılmalıdır.
 *
 * @param {object} conn      - mysql2 bağlantısı (transaction'lı)
 * @param {string} table     - Hedef tablo adı
 * @param {object[]} rows    - DB sütun adlı satır dizisi
 * @param {string[]} columns - INSERT edilecek sütunlar (rows[0]'dan çıkarılır)
 * @returns {Promise<number[]>} - Her batch'in insertId listesi (ilk kayıt ID)
 */
async function batchInsert(conn, table, rows, columns) {
  if (rows.length === 0) return [];
  const insertedIds = [];

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
    const values = batch.flatMap((row) => columns.map((col) => row[col] !== undefined ? row[col] : null));
    const sql = `INSERT INTO \`${table}\` (${columns.map((c) => `\`${c}\``).join(', ')}) VALUES ${placeholders}`;
    const [result] = await conn.execute(sql, values);
    insertedIds.push(result.insertId);
  }

  return insertedIds;
}

/**
 * import_errors tablosuna hatalı satırları toplu yazar.
 */
async function writeImportErrors(conn, importId, invalidRows) {
  if (invalidRows.length === 0) return;
  const errorData = invalidRows.map((item) => ({
    import_id: importId,
    row_number: item.rowIndex,
    raw_data: JSON.stringify(item.row),
    error_message: item.errors.slice(0, 3).join(' | ').slice(0, 1000),
  }));
  await batchInsert(conn, 'import_errors', errorData, ['import_id', 'row_number', 'raw_data', 'error_message']);
}

// ─── Raw tablolu kaynaklar için pipeline ─────────────────────────────────────

/**
 * Raw tablosu olan kaynaklar için tam import akışı:
 * parse → validate → raw INSERT → transform → map → clean INSERT
 *
 * @param {object} conn      - Transaction bağlantısı
 * @param {object[]} rows    - Parser'dan gelen satırlar
 * @param {object} mapping   - Mapping config
 * @param {number} importId
 * @returns {Promise<{successRows: number, errorRows: number}>}
 */
async function importWithRawTable(conn, rows, mapping, importId) {
  const { sourceName, rawTable, cleanTable, columns } = mapping;

  // 1. Validate
  const { validRows, invalidRows } = validateRows(rows, mapping);

  // 2. Hatalı satırları import_errors'a yaz
  await writeImportErrors(conn, importId, invalidRows);

  if (validRows.length === 0) {
    return { successRows: 0, errorRows: invalidRows.length };
  }

  // 3. Raw tabloya yaz (orijinal CSV değerleri + import_id)
  // Raw tabloda numeric kolonlara boş string göndermek MySQL hatasına yol açar → null'a çevir
  const rawMapped = mapRawRows(validRows, mapping).map((r) => {
    const out = {};
    for (const [k, v] of Object.entries(r)) out[k] = (v === '') ? null : v;
    return { ...out, import_id: importId };
  });
  const rawColumns = [...(mapping.rawColumns || Object.keys(rawMapped[0])), 'import_id'];
  // Tekrar çıkarabilir sütunları filtrele
  const uniqueRawCols = [...new Set(rawColumns)];
  await batchInsert(conn, rawTable, rawMapped, uniqueRawCols);

  // 4. raw_id'leri al — son eklenen kayıtlar
  const [[{ minId }]] = await conn.execute(
    `SELECT MIN(id) AS minId FROM \`${rawTable}\` WHERE import_id = ?`,
    [importId]
  );

  // 5. Transform → map → clean INSERT
  const transformed = transformRows(validRows, sourceName);
  const cleanMapped = mapRows(transformed, mapping);

  // Soft FK kontrolü: eşleşmeyen değerleri NULL yap
  const softFkEntries = (mapping.fkChecks || []).filter(fk => fk.severity === 'soft' && fk.nullable);
  if (softFkEntries.length > 0) {
    const softFkSets = {};
    for (const fk of softFkEntries) {
      const [fkRows] = await conn.execute(`SELECT \`${fk.refCol}\` FROM \`${fk.refTable}\``);
      softFkSets[fk.dbCol] = new Set(fkRows.map((r) => String(r[fk.refCol])));
    }
    for (const row of cleanMapped) {
      for (const [col, validSet] of Object.entries(softFkSets)) {
        if (row[col] !== null && row[col] !== undefined && !validSet.has(String(row[col]))) {
          row[col] = null;
        }
      }
    }
  }

  // clean tabloya raw_id ekle (sırayla eşleştir — aynı transaction, sıra garantili)
  const cleanColumns = ['raw_id', ...columns.map((c) => c.db)];
  const cleanRows = cleanMapped.map((row, i) => ({ raw_id: minId + i, ...row }));
  await batchInsert(conn, cleanTable, cleanRows, cleanColumns);

  return { successRows: validRows.length, errorRows: invalidRows.length };
}

/**
 * Raw tablosu olmayan kaynaklar için doğrudan clean tablo import:
 * orders, order_items, products, customers, campaigns, channel_mapping
 *
 * @param {object} conn
 * @param {object[]} rows
 * @param {object} mapping
 * @param {number} importId
 * @returns {Promise<{successRows: number, errorRows: number}>}
 */
async function importDirectToClean(conn, rows, mapping, importId) {
  const { sourceName, cleanTable, columns, duplicateStrategy } = mapping;

  // Validate
  const { validRows, invalidRows } = validateRows(rows, mapping);
  await writeImportErrors(conn, importId, invalidRows);

  if (validRows.length === 0) {
    return { successRows: 0, errorRows: invalidRows.length };
  }

  // Transform → map
  const transformed = transformRows(validRows, sourceName);
  const cleanMapped = mapRows(transformed, mapping);
  const cleanColumns = columns.map((c) => c.db);

  if (duplicateStrategy === 'upsert') {
    // INSERT ... ON DUPLICATE KEY UPDATE — master tablolar için
    const updateClause = cleanColumns
      .filter((c) => !['sku', 'customer_id', 'campaign_name', 'source'].includes(c))
      .map((c) => `\`${c}\` = VALUES(\`${c}\`)`)
      .join(', ');

    for (let i = 0; i < cleanMapped.length; i += BATCH_SIZE) {
      const batch = cleanMapped.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => `(${cleanColumns.map(() => '?').join(', ')})`).join(', ');
      const values = batch.flatMap((row) => cleanColumns.map((col) => row[col] !== undefined ? row[col] : null));
      const sql = `INSERT INTO \`${cleanTable}\` (${cleanColumns.map((c) => `\`${c}\``).join(', ')})
                   VALUES ${placeholders}
                   ON DUPLICATE KEY UPDATE ${updateClause}`;
      await conn.execute(sql, values);
    }
  } else {
    // Standart INSERT (pk duplicate → hata → transaction rollback eder)
    await batchInsert(conn, cleanTable, cleanMapped, cleanColumns);
  }

  return { successRows: validRows.length, errorRows: invalidRows.length };
}

// ─── Ana import fonksiyonu ────────────────────────────────────────────────────

/**
 * Tam import pipeline'ını çalıştırır.
 * Transaction içinde çalışır — herhangi bir hata tüm işlemi geri alır.
 *
 * @param {object} params
 * @param {object[]} params.rows       - Parser'dan gelen satır listesi
 * @param {object}   params.mapping    - Mapping config
 * @param {number}   params.importId   - imports tablosundaki kayıt ID
 * @returns {Promise<{
 *   importId: number,
 *   totalRows: number,
 *   successRows: number,
 *   errorRows: number,
 *   status: string
 * }>}
 */
// Sequelize bağımlılığı olmadan imports tablosunu günceller (raw SQL)
async function updateImportStatus(conn, importId, { status, totalRows, successRows, errorRows, errorMessage } = {}) {
  const fields = ['status = ?'];
  const values = [status];
  if (totalRows   !== undefined) { fields.push('total_rows = ?');   values.push(totalRows); }
  if (successRows !== undefined) { fields.push('success_rows = ?'); values.push(successRows); }
  if (errorRows   !== undefined) { fields.push('error_rows = ?');   values.push(errorRows); }
  if (errorMessage!== undefined) { fields.push('error_message = ?');values.push(String(errorMessage).slice(0, 1000)); }
  if (status === 'committed' || status === 'failed') fields.push('completed_at = NOW()');
  values.push(importId);
  await conn.execute(`UPDATE imports SET ${fields.join(', ')} WHERE id = ?`, values);
}

async function runImport({ rows, mapping, importId }) {
  const conn = await pool.getConnection();

  try {
    // imports → validating
    await updateImportStatus(conn, importId, { status: 'validating', totalRows: rows.length });

    await conn.beginTransaction();

    let successRows = 0;
    let errorRows = 0;

    if (mapping.rawTable) {
      ({ successRows, errorRows } = await importWithRawTable(conn, rows, mapping, importId));
    } else {
      ({ successRows, errorRows } = await importDirectToClean(conn, rows, mapping, importId));
    }

    await conn.commit();

    // imports → committed
    await updateImportStatus(conn, importId, {
      status: 'committed',
      totalRows: rows.length,
      successRows,
      errorRows,
    });

    return {
      importId,
      totalRows: rows.length,
      successRows,
      errorRows,
      status: 'committed',
    };

  } catch (err) {
    await conn.rollback().catch(() => {});

    await updateImportStatus(conn, importId, {
      status: 'failed',
      errorMessage: err.message,
    }).catch(() => {});

    throw new Error(`Import başarısız (rollback yapıldı): ${err.message}`);
  } finally {
    conn.release();
  }
}

/**
 * Belirtilen importId'ye ait tüm verileri geri alır (rollback).
 * raw ve clean tablolardan siler, imports.status = rolled_back yapar.
 *
 * @param {number} importId
 * @param {object} mapping
 */
async function rollbackImport(importId, mapping) {
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    if (mapping.rawTable) {
      // clean → raw sırasıyla sil (FK: clean.raw_id → raw.id)
      await conn.execute(
        `DELETE c FROM \`${mapping.cleanTable}\` c
         INNER JOIN \`${mapping.rawTable}\` r ON c.raw_id = r.id
         WHERE r.import_id = ?`,
        [importId]
      );
      await conn.execute(
        `DELETE FROM \`${mapping.rawTable}\` WHERE import_id = ?`,
        [importId]
      );
    }

    // import_errors temizle
    await conn.execute(`DELETE FROM import_errors WHERE import_id = ?`, [importId]);

    await conn.commit();

    await updateImportStatus(conn, importId, { status: 'rolled_back' });

  } catch (err) {
    await conn.rollback();
    throw new Error(`Rollback başarısız: ${err.message}`);
  } finally {
    conn.release();
  }
}

module.exports = { runImport, rollbackImport };
