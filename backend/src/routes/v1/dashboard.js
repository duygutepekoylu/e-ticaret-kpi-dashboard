'use strict';

const router = require('express').Router();
const ctrl = require('../../controllers/dashboardController');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Dashboard grafik ve özet verileri
 */

/**
 * @swagger
 * /api/v1/dashboard/trend:
 *   get:
 *     summary: Günlük zaman serisi — sessions, revenue, spend, roas
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Günlük trend verisi
 *       401:
 *         description: Token gerekli
 */
router.get('/trend', ctrl.getTrend);

/**
 * @swagger
 * /api/v1/dashboard/channel-performance:
 *   get:
 *     summary: Kanal bazlı performans (sessions, revenue, roas, conversion_rate)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Kanal performans verileri
 *       401:
 *         description: Token gerekli
 */
router.get('/channel-performance', ctrl.getChannelPerformance);

/**
 * @swagger
 * /api/v1/dashboard/platform-performance:
 *   get:
 *     summary: Platform bazlı reklam performansı (Meta vs Google)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Platform performans verileri
 */
router.get('/platform-performance', ctrl.getPlatformPerformance);

/**
 * @swagger
 * /api/v1/dashboard/campaign-performance:
 *   get:
 *     summary: Kampanya bazlı performans (spend, revenue, roas, ctr)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [meta, google]
 *         description: Platform filtresi
 *     responses:
 *       200:
 *         description: Kampanya performans verileri
 */
router.get('/campaign-performance', ctrl.getCampaignPerformance);

/**
 * @swagger
 * /api/v1/dashboard/funnel:
 *   get:
 *     summary: 6 adımlı satın alma hunisi
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Huni adımları ve drop-off oranları
 */
router.get('/funnel', ctrl.getFunnel);

module.exports = router;
