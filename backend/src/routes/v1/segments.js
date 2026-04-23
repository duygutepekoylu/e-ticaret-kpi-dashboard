'use strict';

const router = require('express').Router();
const { pool } = require('../../config/database');
const { success, error } = require('../../utils/formatters');
const { auditLog } = require('../../utils/auditLogger');

/**
 * @swagger
 * tags:
 *   name: Segments
 *   description: Kullanıcı tanımlı segmentler
 */

/**
 * @swagger
 * /api/v1/segments:
 *   get:
 *     summary: Segment listesi
 *     tags: [Segments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aktif segmentler
 */
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM segments WHERE is_active = 1 ORDER BY created_at DESC'
    );
    res.json(success({ segments: rows }, { total: rows.length }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/segments/{id}:
 *   get:
 *     summary: Segment detayı
 *     tags: [Segments]
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
 *         description: Segment detayı
 *       404:
 *         description: Bulunamadı
 */
router.get('/:id', async (req, res, next) => {
  try {
    const [[segment]] = await pool.execute(
      'SELECT * FROM segments WHERE id = ? AND is_active = 1',
      [req.params.id]
    );
    if (!segment) return res.status(404).json(error('NOT_FOUND', 'Segment bulunamadı'));
    res.json(success({ segment }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/segments:
 *   post:
 *     summary: Yeni segment oluştur
 *     tags: [Segments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, rules]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               rules:
 *                 type: object
 *                 example: {"channel": "Paid Social", "device": "mobile"}
 *     responses:
 *       201:
 *         description: Segment oluşturuldu
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, description, rules } = req.body;
    if (!name || !rules || typeof rules !== 'object') {
      return res.status(400).json(error('VALIDATION_ERROR', 'name ve rules (object) zorunlu'));
    }

    const [result] = await pool.execute(
      'INSERT INTO segments (created_by, name, description, rules) VALUES (?, ?, ?, ?)',
      [req.user.id, name, description || null, JSON.stringify(rules)]
    );

    await auditLog({ userId: req.user.id, action: 'SEGMENT_CREATE', recordId: String(result.insertId), newValue: rules });
    res.status(201).json(success({ id: result.insertId }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/segments/{id}:
 *   put:
 *     summary: Segment güncelle
 *     tags: [Segments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               rules:
 *                 type: object
 *     responses:
 *       200:
 *         description: Güncellendi
 *       404:
 *         description: Bulunamadı
 */
router.put('/:id', async (req, res, next) => {
  try {
    const [[existing]] = await pool.execute(
      'SELECT id, rules FROM segments WHERE id = ? AND is_active = 1',
      [req.params.id]
    );
    if (!existing) return res.status(404).json(error('NOT_FOUND', 'Segment bulunamadı'));

    const { name, description, rules } = req.body;
    const fields = [];
    const params = [];
    if (name !== undefined)        { fields.push('name = ?');        params.push(name); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (rules !== undefined)       { fields.push('rules = ?');       params.push(JSON.stringify(rules)); }

    if (fields.length === 0) return res.status(400).json(error('VALIDATION_ERROR', 'Güncellenecek alan yok'));
    params.push(req.params.id);

    await pool.execute(`UPDATE segments SET ${fields.join(', ')} WHERE id = ?`, params);
    await auditLog({ userId: req.user.id, action: 'SEGMENT_UPDATE', recordId: String(req.params.id), oldValue: existing.rules, newValue: rules });
    res.json(success({ updated: true }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/segments/{id}:
 *   delete:
 *     summary: Segment sil (soft delete)
 *     tags: [Segments]
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
 *         description: Silindi
 *       404:
 *         description: Bulunamadı
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const [result] = await pool.execute(
      'UPDATE segments SET is_active = 0 WHERE id = ? AND is_active = 1',
      [req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json(error('NOT_FOUND', 'Segment bulunamadı'));
    await auditLog({ userId: req.user.id, action: 'SEGMENT_DELETE', recordId: String(req.params.id) });
    res.json(success({ deleted: true }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/segments/{id}/preview:
 *   get:
 *     summary: Segment kurallarına uyan sipariş sayısını önizle
 *     tags: [Segments]
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
 *         description: Eşleşen sipariş ve müşteri sayısı
 *       404:
 *         description: Bulunamadı
 */
router.get('/:id/preview', async (req, res, next) => {
  try {
    const [[segment]] = await pool.execute(
      'SELECT rules FROM segments WHERE id = ? AND is_active = 1',
      [req.params.id]
    );
    if (!segment) return res.status(404).json(error('NOT_FOUND', 'Segment bulunamadı'));

    const rules = typeof segment.rules === 'string' ? JSON.parse(segment.rules) : segment.rules;
    const conditions = [];
    const params = [];

    if (rules.channel)  { conditions.push('o.channel = ?');        params.push(rules.channel); }
    if (rules.campaign) { conditions.push('o.campaign_name = ?');  params.push(rules.campaign); }
    if (rules.city)     { conditions.push('c.city = ?');           params.push(rules.city); }

    const join = rules.city ? 'JOIN customers c ON o.customer_id = c.customer_id' : '';
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[counts]] = await pool.execute(
      `SELECT COUNT(DISTINCT o.order_id) AS matching_orders,
              COUNT(DISTINCT o.customer_id) AS matching_customers
       FROM orders o ${join} ${where}`,
      params
    );

    res.json(success({ rules, matching_orders: counts.matching_orders, matching_customers: counts.matching_customers }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
