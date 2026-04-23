'use strict';

const router = require('express').Router();
const { pool } = require('../../config/database');
const { success, error } = require('../../utils/formatters');
const { auditLog } = require('../../utils/auditLogger');

/**
 * @swagger
 * tags:
 *   name: Views
 *   description: Kaydedilmiş dashboard görünümleri
 */

/**
 * @swagger
 * /api/v1/views:
 *   get:
 *     summary: Kullanıcının kaydedilmiş görünümlerini listele
 *     tags: [Views]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Görünüm listesi
 */
router.get('/', async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM saved_views WHERE user_id = ? ORDER BY is_default DESC, updated_at DESC',
      [req.user.id]
    );
    res.json(success({ views: rows }, { total: rows.length }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/views/{id}:
 *   get:
 *     summary: Tek görünüm detayı
 *     tags: [Views]
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
 *         description: Görünüm detayı
 *       404:
 *         description: Bulunamadı
 */
router.get('/:id', async (req, res, next) => {
  try {
    const [[view]] = await pool.execute(
      'SELECT * FROM saved_views WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!view) return res.status(404).json(error('NOT_FOUND', 'Görünüm bulunamadı'));
    res.json(success({ view }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/views:
 *   post:
 *     summary: Yeni görünüm kaydet
 *     tags: [Views]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, layout]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               layout:
 *                 type: object
 *               filters:
 *                 type: object
 *               is_default:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Görünüm oluşturuldu
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, description, layout, filters, is_default = false } = req.body;
    if (!name || !layout) {
      return res.status(400).json(error('VALIDATION_ERROR', 'name ve layout zorunlu'));
    }

    if (is_default) {
      await pool.execute(
        'UPDATE saved_views SET is_default = 0 WHERE user_id = ?',
        [req.user.id]
      );
    }

    const [result] = await pool.execute(
      'INSERT INTO saved_views (user_id, name, description, layout, filters, is_default) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, name, description || null, JSON.stringify(layout), filters ? JSON.stringify(filters) : null, is_default ? 1 : 0]
    );

    await auditLog({ userId: req.user.id, action: 'VIEW_CREATE', recordId: String(result.insertId) });
    res.status(201).json(success({ id: result.insertId }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/views/{id}:
 *   put:
 *     summary: Görünümü güncelle
 *     tags: [Views]
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
 *               layout:
 *                 type: object
 *               filters:
 *                 type: object
 *               is_default:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Güncellendi
 *       404:
 *         description: Bulunamadı
 */
router.put('/:id', async (req, res, next) => {
  try {
    const [[existing]] = await pool.execute(
      'SELECT id FROM saved_views WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!existing) return res.status(404).json(error('NOT_FOUND', 'Görünüm bulunamadı'));

    const { name, description, layout, filters, is_default } = req.body;
    const fields = [];
    const params = [];
    if (name !== undefined)        { fields.push('name = ?');        params.push(name); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (layout !== undefined)      { fields.push('layout = ?');      params.push(JSON.stringify(layout)); }
    if (filters !== undefined)     { fields.push('filters = ?');     params.push(JSON.stringify(filters)); }
    if (is_default !== undefined) {
      if (is_default) {
        await pool.execute('UPDATE saved_views SET is_default = 0 WHERE user_id = ?', [req.user.id]);
      }
      fields.push('is_default = ?');
      params.push(is_default ? 1 : 0);
    }

    if (fields.length === 0) return res.status(400).json(error('VALIDATION_ERROR', 'Güncellenecek alan yok'));
    params.push(req.params.id);

    await pool.execute(`UPDATE saved_views SET ${fields.join(', ')} WHERE id = ?`, params);
    await auditLog({ userId: req.user.id, action: 'VIEW_UPDATE', recordId: String(req.params.id) });
    res.json(success({ updated: true }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/views/{id}:
 *   delete:
 *     summary: Görünümü sil
 *     tags: [Views]
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
      'DELETE FROM saved_views WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json(error('NOT_FOUND', 'Görünüm bulunamadı'));
    await auditLog({ userId: req.user.id, action: 'VIEW_DELETE', recordId: String(req.params.id) });
    res.json(success({ deleted: true }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
