'use strict';

const router = require('express').Router();
const { verifyToken } = require('../../middleware/auth');
const { login, logout, me } = require('../../controllers/authController');

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Kimlik doğrulama
 */

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Giriş yap ve JWT token al
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Giriş başarılı — token döner
 *       401:
 *         description: Geçersiz kimlik bilgisi
 */
router.post('/login', login);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Çıkış yap (audit log kaydı)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Çıkış yapıldı
 */
router.post('/logout', logout);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Mevcut kullanıcı bilgisini getir
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı bilgisi
 *       401:
 *         description: Token gerekli
 */
router.get('/me', verifyToken, me);

module.exports = router;
