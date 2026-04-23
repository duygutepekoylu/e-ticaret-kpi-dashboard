'use strict';

const router = require('express').Router();
const { requireRole } = require('../../middleware/auth');
const ctrl = require('../../controllers/kpiController');

/**
 * @swagger
 * tags:
 *   name: KPI
 *   description: KPI hesaplama ve özet metrikler
 */

/**
 * @swagger
 * /api/v1/kpi/run:
 *   post:
 *     summary: Tüm KPI tablolarını yeniden hesapla
 *     tags: [KPI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: KPI hesaplama sonuçları
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           table:
 *                             type: string
 *                           rows:
 *                             type: integer
 *                           durationMs:
 *                             type: integer
 *       401:
 *         description: Token gerekli
 *       403:
 *         description: Yetkisiz (viewer erişemez)
 */
router.post('/run', requireRole('admin', 'marketing'), ctrl.runKpi);

/**
 * @swagger
 * /api/v1/kpi/summary:
 *   get:
 *     summary: Trafik, reklam ve satış özet metrikleri
 *     tags: [KPI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         description: Başlangıç tarihi (YYYY-MM-DD)
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         description: Bitiş tarihi (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Özet KPI metrikleri
 *       401:
 *         description: Token gerekli
 */
router.get('/summary', ctrl.getSummary);

module.exports = router;
