'use strict';

const router = require('express').Router();
const { pool } = require('../../config/database');
const { success } = require('../../utils/formatters');
const { requireRole } = require('../../middleware/auth');
const { auditLog } = require('../../utils/auditLogger');

/**
 * @swagger
 * tags:
 *   name: Normalize
 *   description: Kanal mapping normalizasyonu
 */

/**
 * @swagger
 * /api/v1/normalize/run:
 *   post:
 *     summary: orders tablosundaki channel alanını channel_mapping ile normalize et
 *     tags: [Normalize]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Normalizasyon tamamlandı
 *       403:
 *         description: Sadece admin ve marketing erişebilir
 */
router.post('/run', requireRole('admin', 'marketing'), async (req, res, next) => {
  try {
    // channel_mapping'den tüm kayıtları al
    const [mappings] = await pool.execute(
      'SELECT source, medium, channel_group FROM channel_mapping'
    );

    let updatedRows = 0;
    for (const mapping of mappings) {
      const [result] = await pool.execute(
        'UPDATE orders SET channel = ? WHERE source = ? AND medium = ?',
        [mapping.channel_group, mapping.source, mapping.medium]
      );
      updatedRows += result.affectedRows;
    }

    await auditLog({ userId: req.user.id, action: 'NORMALIZE_RUN', tableName: 'orders', recordId: String(updatedRows) });
    res.json(success({ updated_rows: updatedRows, mappings_applied: mappings.length }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
