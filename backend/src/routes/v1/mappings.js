'use strict';

const router = require('express').Router();
const { requireRole } = require('../../middleware/auth');
const ctrl = require('../../controllers/mappingController');

/**
 * @swagger
 * tags:
 *   name: Mappings
 *   description: Kanal mapping yönetimi
 */

/**
 * @swagger
 * /api/v1/mappings/channels:
 *   get:
 *     summary: Tüm kanal mapping'lerini listele
 *     tags: [Mappings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kanal listesi
 */
router.get('/channels', ctrl.listChannels);

/**
 * @swagger
 * /api/v1/mappings/channels:
 *   post:
 *     summary: Yeni kanal mapping ekle
 *     tags: [Mappings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [source, medium, channel_group]
 *             properties:
 *               source:
 *                 type: string
 *               medium:
 *                 type: string
 *               channel_group:
 *                 type: string
 *     responses:
 *       201:
 *         description: Oluşturuldu
 *       409:
 *         description: Zaten mevcut
 */
router.post('/channels', requireRole('admin'), ctrl.createChannel);

/**
 * @swagger
 * /api/v1/mappings/channels/{source}/{medium}:
 *   put:
 *     summary: Kanal mapping güncelle
 *     tags: [Mappings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: source
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: medium
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [channel_group]
 *             properties:
 *               channel_group:
 *                 type: string
 *     responses:
 *       200:
 *         description: Güncellendi
 *       404:
 *         description: Bulunamadı
 */
router.put('/channels/:source/:medium', requireRole('admin'), ctrl.updateChannel);

/**
 * @swagger
 * /api/v1/mappings/channels/{source}/{medium}:
 *   delete:
 *     summary: Kanal mapping sil
 *     tags: [Mappings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: source
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: medium
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Silindi
 *       404:
 *         description: Bulunamadı
 */
router.delete('/channels/:source/:medium', requireRole('admin'), ctrl.deleteChannel);

module.exports = router;
