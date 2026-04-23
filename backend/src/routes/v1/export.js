'use strict';

const router = require('express').Router();
const { pool } = require('../../config/database');
const { success, error } = require('../../utils/formatters');
const { auditLog } = require('../../utils/auditLogger');

/**
 * @swagger
 * tags:
 *   name: Export
 *   description: Veri dışa aktarma
 */

/**
 * @swagger
 * /api/v1/export:
 *   get:
 *     summary: KPI verilerini JSON formatında dışa aktar
 *     tags: [Export]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: table
 *         required: true
 *         schema:
 *           type: string
 *           enum: [kpi_daily_traffic, kpi_daily_ads, kpi_daily_sales, agg_channel_performance, agg_campaign_performance, agg_product_performance, agg_cohort_retention]
 *         description: Dışa aktarılacak tablo
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
 *         description: Tablo verisi JSON formatında
 *       400:
 *         description: Geçersiz tablo adı
 */
const ALLOWED_TABLES = new Set([
  'kpi_daily_traffic', 'kpi_daily_ads', 'kpi_daily_sales',
  'agg_channel_performance', 'agg_campaign_performance',
  'agg_product_performance', 'agg_cohort_retention',
]);

router.get('/', async (req, res, next) => {
  try {
    const { table, date_from, date_to } = req.query;

    if (!table || !ALLOWED_TABLES.has(table)) {
      return res.status(400).json(error('INVALID_TABLE', `Geçerli tablo adları: ${[...ALLOWED_TABLES].join(', ')}`));
    }

    const conditions = [];
    const params = [];
    const dateField = table.startsWith('agg_cohort') ? 'cohort_month' : 'date';

    if (date_from) { conditions.push(`${dateField} >= ?`); params.push(date_from); }
    if (date_to)   { conditions.push(`${dateField} <= ?`); params.push(date_to); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // tablo adı ALLOWED_TABLES ile doğrulandı — injection güvenli
    const [rows] = await pool.execute(`SELECT * FROM ${table} ${where} LIMIT 50000`, params);

    await auditLog({ userId: req.user.id, action: 'EXPORT', tableName: table, recordId: String(rows.length) });
    res.json(success({ table, rows }, { total: rows.length }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
