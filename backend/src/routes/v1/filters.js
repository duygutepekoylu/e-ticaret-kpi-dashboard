'use strict';

const router = require('express').Router();
const { pool } = require('../../config/database');
const { success } = require('../../utils/formatters');

/**
 * @swagger
 * tags:
 *   name: Filters
 *   description: Filtre seçenekleri
 */

/**
 * @swagger
 * /api/v1/filters/channels:
 *   get:
 *     summary: Kanal listesi (orders tablosundan)
 *     tags: [Filters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Benzersiz kanal adları listesi
 */
router.get('/channels', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT DISTINCT channel FROM orders WHERE channel IS NOT NULL ORDER BY channel ASC'
    );
    res.json(success({ channels: rows.map(r => r.channel) }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/filters/campaigns:
 *   get:
 *     summary: Kampanya listesi
 *     tags: [Filters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Benzersiz kampanya adları
 */
router.get('/campaigns', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id AS campaign_id, campaign_name FROM campaigns ORDER BY campaign_name ASC'
    );
    res.json(success({ campaigns: rows }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/filters/devices:
 *   get:
 *     summary: Cihaz kategorisi listesi (GA4'ten)
 *     tags: [Filters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Benzersiz cihaz kategorileri
 */
router.get('/devices', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT DISTINCT device_category FROM ga4_traffic WHERE device_category IS NOT NULL ORDER BY device_category ASC'
    );
    res.json(success({ devices: rows.map(r => r.device_category) }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/filters/cities:
 *   get:
 *     summary: Şehir listesi (GA4'ten)
 *     tags: [Filters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Benzersiz şehirler
 */
router.get('/cities', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT DISTINCT city FROM ga4_traffic WHERE city IS NOT NULL AND city != "" ORDER BY city ASC LIMIT 200'
    );
    res.json(success({ cities: rows.map(r => r.city) }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/filters/date-range:
 *   get:
 *     summary: Verideki min/max tarih aralığı
 *     tags: [Filters]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: En erken ve en geç tarih
 */
router.get('/date-range', async (req, res, next) => {
  try {
    const [[row]] = await pool.execute(
      'SELECT MIN(date) AS date_from, MAX(date) AS date_to FROM kpi_daily_traffic'
    );
    res.json(success({ date_from: row.date_from, date_to: row.date_to }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
