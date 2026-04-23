'use strict';

const path = require('path');
const fs   = require('fs');
const importModel   = require('../models/import');
const { preview, parseFile } = require('../importer/previewer');
const { validateRows }       = require('../importer/validator');
const { checkDuplicate }     = require('../importer/duplicateChecker');
const { runImport, rollbackImport } = require('../importer/importer');
const { runAllKpi }          = require('../kpi/runner');
const { success, error }     = require('../utils/formatters');
const { auditLog }           = require('../utils/auditLogger');
const { pool }               = require('../config/database');

// Mapping config'leri sourceName → config objesi
const MAPPINGS = {
  ga4_traffic:          require('../importer/config/ga4TrafficMapping'),
  ga4_item_interactions:require('../importer/config/ga4ItemsMapping'),
  meta_ads:             require('../importer/config/metaAdsMapping'),
  meta_ads_breakdowns:  require('../importer/config/metaBreakdownsMapping'),
  google_ads:           require('../importer/config/googleAdsMapping'),
  orders:               require('../importer/config/ordersMapping'),
  order_items:          require('../importer/config/orderItemsMapping'),
  products:             require('../importer/config/productsMapping'),
  customers:            require('../importer/config/customersMapping'),
  campaigns:            require('../importer/config/campaignsMapping'),
  channel_mapping:      require('../importer/config/channelMappingMapping'),
};

function getMapping(sourceTable) {
  const m = MAPPINGS[sourceTable];
  if (!m) throw Object.assign(new Error(`Geçersiz source_table: "${sourceTable}"`), { status: 400, code: 'INVALID_SOURCE' });
  return m;
}

function getUploadPath(importId, originalName) {
  const dir = path.join(__dirname, '../../../uploads');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(originalName);
  return path.join(dir, `import_${importId}${ext}`);
}

function removeFile(filePath) {
  try { if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
}

/**
 * POST /api/v1/imports
 * multipart/form-data: file + source_table
 */
async function upload(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json(error('VALIDATION_ERROR', 'Dosya yüklenmedi'));
    }
    const { source_table } = req.body;
    if (!source_table) {
      removeFile(req.file.path);
      return res.status(400).json(error('VALIDATION_ERROR', 'source_table zorunlu'));
    }

    try { getMapping(source_table); } catch (e) {
      removeFile(req.file.path);
      return res.status(400).json(error(e.code, e.message));
    }

    const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
    const importId = await importModel.create({
      userId: req.user.id,
      sourceTable: source_table,
      filename: req.file.originalname,
      fileType: ext,
    });

    // Yüklenen dosyayı kalıcı konuma taşı
    const destPath = getUploadPath(importId, req.file.originalname);
    fs.renameSync(req.file.path, destPath);

    await auditLog({ userId: req.user.id, action: 'IMPORT_UPLOAD', tableName: 'imports', recordId: importId, newValue: { sourceTable: source_table, filename: req.file.originalname }, ipAddress: req.ip });

    res.status(201).json(success({ importId, sourceTable: source_table, filename: req.file.originalname, status: 'pending' }, { message: 'Dosya yüklendi. Önizleme için /preview endpoint\'ini kullanın.' }));
  } catch (err) {
    removeFile(req.file && req.file.path);
    next(err);
  }
}

/**
 * GET /api/v1/imports
 */
async function list(req, res, next) {
  try {
    const { source_table, status, page = 1, limit = 20 } = req.query;
    const { rows, total } = await importModel.findAll({ sourceTable: source_table, status, page: +page, limit: +limit });
    res.json(success(rows, { total, page: +page, limit: +limit }));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/imports/:id
 */
async function getById(req, res, next) {
  try {
    const imp = await importModel.findById(+req.params.id);
    if (!imp) return res.status(404).json(error('NOT_FOUND', 'Import kaydı bulunamadı'));
    res.json(success(imp));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/imports/:id/preview
 */
async function previewImport(req, res, next) {
  try {
    const imp = await importModel.findById(+req.params.id);
    if (!imp) return res.status(404).json(error('NOT_FOUND', 'Import kaydı bulunamadı'));

    const filePath = getUploadPath(imp.id, imp.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json(error('FILE_NOT_FOUND', 'Dosya bulunamadı'));
    }

    const mapping = getMapping(imp.source_table);
    const result  = await preview(filePath, mapping);

    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/imports/:id/map-columns
 * Body: { source_table } — kaynak tabloyu değiştirir (opsiyonel düzeltme)
 */
async function mapColumns(req, res, next) {
  try {
    const imp = await importModel.findById(+req.params.id);
    if (!imp) return res.status(404).json(error('NOT_FOUND', 'Import kaydı bulunamadı'));
    if (imp.status === 'committed') {
      return res.status(409).json(error('ALREADY_COMMITTED', 'Commit edilmiş import değiştirilemez'));
    }

    const { source_table } = req.body;
    if (source_table && source_table !== imp.source_table) {
      try { getMapping(source_table); } catch (e) {
        return res.status(400).json(error(e.code, e.message));
      }
      await importModel.updateSourceTable(imp.id, source_table);
    }

    const currentMapping = getMapping(source_table || imp.source_table);
    const filePath = getUploadPath(imp.id, imp.filename);
    const suggestion = fs.existsSync(filePath)
      ? (await preview(filePath, currentMapping)).mappingSuggestion
      : [];

    res.json(success({ sourceTable: source_table || imp.source_table, mappingSuggestion: suggestion }));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/imports/:id/validate
 */
async function validateImport(req, res, next) {
  try {
    const imp = await importModel.findById(+req.params.id);
    if (!imp) return res.status(404).json(error('NOT_FOUND', 'Import kaydı bulunamadı'));

    const filePath = getUploadPath(imp.id, imp.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json(error('FILE_NOT_FOUND', 'Dosya bulunamadı'));
    }

    const mapping = getMapping(imp.source_table);

    // Duplicate kontrolü
    const dupResult = await checkDuplicate(mapping, filePath);

    // Tam dosyayı parse et
    const { rows } = await parseFile(filePath, Infinity);
    const { validRows, invalidRows } = validateRows(rows, mapping);

    const report = {
      totalRows:   rows.length,
      validRows:   validRows.length,
      errorRows:   invalidRows.length,
      duplicate:   dupResult,
      errors:      invalidRows.slice(0, 50).map(item => ({
        rowIndex: item.rowIndex,
        errors:   item.errors,
      })),
    };

    res.json(success(report));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/imports/:id/commit
 */
async function commit(req, res, next) {
  try {
    const imp = await importModel.findById(+req.params.id);
    if (!imp) return res.status(404).json(error('NOT_FOUND', 'Import kaydı bulunamadı'));
    if (imp.status === 'committed') {
      return res.status(409).json(error('ALREADY_COMMITTED', 'Bu import zaten commit edilmiş'));
    }

    const filePath = getUploadPath(imp.id, imp.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json(error('FILE_NOT_FOUND', 'Dosya bulunamadı'));
    }

    const mapping = getMapping(imp.source_table);

    // Tam parse
    const { rows } = await parseFile(filePath, Infinity);

    // Import pipeline
    const result = await runImport({ rows, mapping, importId: imp.id });

    // KPI'ı arka planda tetikle (hata import'u engellemez)
    runAllKpi().catch(e => console.error('[KPI] Tetikleme hatası:', e.message));

    await auditLog({ userId: req.user.id, action: 'IMPORT_COMMIT', tableName: 'imports', recordId: imp.id, newValue: { successRows: result.successRows, errorRows: result.errorRows }, ipAddress: req.ip });

    res.json(success(result));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/imports/:id/errors
 */
async function getErrors(req, res, next) {
  try {
    const imp = await importModel.findById(+req.params.id);
    if (!imp) return res.status(404).json(error('NOT_FOUND', 'Import kaydı bulunamadı'));

    const page  = +(req.query.page  || 1);
    const limit = +(req.query.limit || 50);
    const offset = (page - 1) * limit;

    const [[{ total }]] = await pool.query(
      'SELECT COUNT(*) AS total FROM import_errors WHERE import_id = ?',
      [imp.id]
    );
    const [rows] = await pool.query(
      'SELECT `row_number`, raw_data, error_message, created_at FROM import_errors WHERE import_id = ? ORDER BY `row_number` LIMIT ? OFFSET ?',
      [imp.id, limit, offset]
    );

    res.json(success(rows, { total, page, limit }));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/imports/:id
 */
async function rollback(req, res, next) {
  try {
    const imp = await importModel.findById(+req.params.id);
    if (!imp) return res.status(404).json(error('NOT_FOUND', 'Import kaydı bulunamadı'));

    if (!['committed', 'failed', 'pending'].includes(imp.status)) {
      return res.status(409).json(error('INVALID_STATUS', `"${imp.status}" durumunda rollback yapılamaz`));
    }

    const mapping = getMapping(imp.source_table);
    await rollbackImport(imp.id, mapping);

    // Yüklenen dosyayı sil
    removeFile(getUploadPath(imp.id, imp.filename));

    await auditLog({ userId: req.user.id, action: 'IMPORT_ROLLBACK', tableName: 'imports', recordId: imp.id, ipAddress: req.ip });

    res.json(success({ importId: imp.id, status: 'rolled_back' }));
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, list, getById, previewImport, mapColumns, validateImport, commit, getErrors, rollback };
