'use strict';

const router = require('express').Router();
const multer = require('multer');
const path   = require('path');
const os     = require('os');
const { requireRole } = require('../../middleware/auth');
const ctrl = require('../../controllers/importController');

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
  fileFilter(req, file, cb) {
    const allowed = ['.csv', '.xlsx', '.xls', '.json'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) return cb(null, true);
    cb(new Error(`Desteklenmeyen format: ${ext}. İzin verilen: ${allowed.join(', ')}`));
  },
});

/**
 * @swagger
 * tags:
 *   name: Imports
 *   description: Veri yükleme ve import yönetimi
 */

/**
 * @swagger
 * /api/v1/imports:
 *   post:
 *     summary: Dosya yükle ve import kaydı oluştur
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file, source_table]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               source_table:
 *                 type: string
 *                 enum: [ga4_traffic, ga4_item_interactions, meta_ads, meta_ads_breakdowns, google_ads, orders, order_items, products, customers, campaigns, channel_mapping]
 *     responses:
 *       201:
 *         description: Import kaydı oluşturuldu
 *       400:
 *         description: Dosya yok veya geçersiz source_table
 */
router.post('/', requireRole('admin', 'marketing'), upload.single('file'), ctrl.upload);

/**
 * @swagger
 * /api/v1/imports:
 *   get:
 *     summary: Import geçmişini listele
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: source_table
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Import listesi
 */
router.get('/', ctrl.list);

/**
 * @swagger
 * /api/v1/imports/{id}:
 *   get:
 *     summary: Import detayı
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Import detayı
 *       404:
 *         description: Bulunamadı
 */
router.get('/:id', ctrl.getById);

/**
 * @swagger
 * /api/v1/imports/{id}/preview:
 *   get:
 *     summary: Dosyanın ilk 10 satırını önizle (DB'ye yazılmaz)
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Önizleme verisi
 */
router.get('/:id/preview', ctrl.previewImport);

/**
 * @swagger
 * /api/v1/imports/{id}/map-columns:
 *   post:
 *     summary: Kolon eşlemesini kaydet / source_table güncelle
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               source_table:
 *                 type: string
 *     responses:
 *       200:
 *         description: Eşleme onaylandı
 */
router.post('/:id/map-columns', requireRole('admin', 'marketing'), ctrl.mapColumns);

/**
 * @swagger
 * /api/v1/imports/{id}/validate:
 *   post:
 *     summary: Dosyayı doğrula — hata raporu döner
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Doğrulama raporu
 */
router.post('/:id/validate', requireRole('admin', 'marketing'), ctrl.validateImport);

/**
 * @swagger
 * /api/v1/imports/{id}/commit:
 *   post:
 *     summary: Import'u DB'ye yaz ve KPI'ı tetikle
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Import tamamlandı
 *       409:
 *         description: Zaten commit edilmiş
 */
router.post('/:id/commit', requireRole('admin', 'marketing'), ctrl.commit);

/**
 * @swagger
 * /api/v1/imports/{id}/errors:
 *   get:
 *     summary: Import hata satırlarını listele
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Hata listesi
 */
router.get('/:id/errors', ctrl.getErrors);

/**
 * @swagger
 * /api/v1/imports/{id}:
 *   delete:
 *     summary: Import'u geri al (rollback)
 *     tags: [Imports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Rollback tamamlandı
 *       409:
 *         description: Rollback yapılamaz
 */
router.delete('/:id', requireRole('admin'), ctrl.rollback);

module.exports = router;
