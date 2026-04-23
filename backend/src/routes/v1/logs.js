'use strict';

const router = require('express').Router();
const { pool } = require('../../config/database');
const { success } = require('../../utils/formatters');
const { requireRole } = require('../../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Logs
 *   description: Audit ve API log kayıtları (sadece admin)
 */

/**
 * @swagger
 * /api/v1/logs/audit:
 *   get:
 *     summary: Audit log kayıtları
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: user_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: Audit log listesi
 *       403:
 *         description: Sadece admin erişebilir
 */
router.get('/audit', requireRole('admin'), async (req, res, next) => {
  try {
    const { user_id, action, page = 1, limit = 50 } = req.query;
    const conditions = [];
    const params = [];
    if (user_id) { conditions.push('user_id = ?'); params.push(user_id); }
    if (action)  { conditions.push('action = ?');  params.push(action); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(limit);

    const parsedLimit = Number(limit) || 50;
    const [rows] = await pool.execute(
      `SELECT al.*, u.email AS user_email FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${where} ORDER BY al.created_at DESC LIMIT ${parsedLimit} OFFSET ${offset}`,
      params
    );
    const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM audit_logs ${where}`, params);

    res.json(success({ logs: rows }, { total, page: Number(page), limit: Number(limit) }));
  } catch (err) {
    next(err);
  }
});

/**
 * @swagger
 * /api/v1/logs/api:
 *   get:
 *     summary: API istek log kayıtları
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: endpoint
 *         schema:
 *           type: string
 *       - in: query
 *         name: status_code
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *     responses:
 *       200:
 *         description: API log listesi
 *       403:
 *         description: Sadece admin erişebilir
 */
router.get('/api', requireRole('admin'), async (req, res, next) => {
  try {
    const { endpoint, status_code, page = 1, limit = 50 } = req.query;
    const conditions = [];
    const params = [];
    if (endpoint)    { conditions.push('endpoint LIKE ?');   params.push(`%${endpoint}%`); }
    if (status_code) { conditions.push('status_code = ?');   params.push(Number(status_code)); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(limit);

    const parsedLimit = Number(limit) || 50;
    const [rows] = await pool.execute(
      `SELECT * FROM api_logs ${where} ORDER BY created_at DESC LIMIT ${parsedLimit} OFFSET ${offset}`,
      params
    );
    const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM api_logs ${where}`, params);

    res.json(success({ logs: rows }, { total, page: Number(page), limit: Number(limit) }));
  } catch (err) {
    next(err);
  }
});

module.exports = router;
