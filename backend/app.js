'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
// swagger: lazy load — sadece /api/v1/docs isteğinde yüklenir
let swaggerJsdoc, swaggerUi;

const env = require('./src/config/env');
const { testConnection } = require('./src/config/database');
const { success, error } = require('./src/utils/formatters');
const requestLogger = require('./src/middleware/requestLogger');
const { verifyToken, requireRole } = require('./src/middleware/auth');
const { errorHandler, notFoundHandler } = require('./src/middleware/errorHandler');

const app = express();
let dbReady = false;

// ----------------------------------------------------------------
// Güvenlik + CORS + JSON
// ----------------------------------------------------------------
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ----------------------------------------------------------------
// Request logger — tüm istekleri api_logs tablosuna yaz
// ----------------------------------------------------------------
app.use(requestLogger);

// ----------------------------------------------------------------
// Swagger dokümantasyonu — lazy load (ilk istek gelince)
// ----------------------------------------------------------------
let swaggerSpec = null;
app.get('/api/v1/docs/spec', (req, res) => {
  if (!swaggerJsdoc) swaggerJsdoc = require('swagger-jsdoc');
  if (!swaggerSpec) {
    swaggerSpec = swaggerJsdoc({
      definition: {
        openapi: '3.0.0',
        info: { title: 'Sporthink KPI API', version: '1.0.0', description: 'Sporthink e-ticaret KPI Dashboard API' },
        servers: [{ url: `http://localhost:${env.app.port}` }],
        components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } } },
      },
      apis: ['./app.js', './src/routes/v1/*.js'],
    });
  }
  res.json(swaggerSpec);
});
app.use('/api/v1/docs', (req, res, next) => {
  if (!swaggerUi) swaggerUi = require('swagger-ui-express');
  if (!swaggerSpec && !swaggerJsdoc) return res.redirect('/api/v1/docs/spec');
  swaggerUi.serve(req, res, next);
});

// ----------------------------------------------------------------
// Public endpoint'ler (auth gerektirmez)
// ----------------------------------------------------------------

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Sunucu ve DB sağlık kontrolü
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Sistem çalışıyor
 */
app.get('/health', async (req, res) => {
  if (dbReady) {
    return res.json(success({ db: 'connected', uptime: process.uptime() }));
  }
  try {
    await testConnection();
    dbReady = true;
    res.json(success({ db: 'connected', uptime: process.uptime() }));
  } catch (err) {
    res.status(500).json(error('DB_ERROR', 'Veritabanı bağlantısı kurulamadı'));
  }
});

// ----------------------------------------------------------------
// Protected endpoint'ler — tüm /api/v1/* JWT gerektirir
// ----------------------------------------------------------------
app.use('/api/v1', verifyToken);

/**
 * @swagger
 * /api/v1/me:
 *   get:
 *     summary: Oturum açmış kullanıcı bilgisi
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kullanıcı bilgisi
 *       401:
 *         description: Token gerekli
 */
app.get('/api/v1/me', (req, res) => {
  res.json(success({ user: req.user }));
});

/**
 * @swagger
 * /api/v1/admin-test:
 *   get:
 *     summary: Admin yetki testi (sadece admin rolü)
 *     tags: [System]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin erişim onaylandı
 *       401:
 *         description: Token gerekli
 *       403:
 *         description: Yetkisiz
 */
app.get('/api/v1/admin-test', requireRole('admin'), (req, res) => {
  res.json(success({ message: 'Admin erişimi onaylandı', user: req.user }));
});

// ----------------------------------------------------------------
// Route'lar — ilerleyen fazlarda eklenecek
// ----------------------------------------------------------------
// app.use('/api/v1/auth',      require('./src/routes/v1/auth'));
// app.use('/api/v1/imports',   require('./src/routes/v1/imports'));
// app.use('/api/v1/kpi',       require('./src/routes/v1/kpi'));
// app.use('/api/v1/dashboard', require('./src/routes/v1/dashboard'));

// ----------------------------------------------------------------
// 404 ve hata yönetimi — en sonda
// ----------------------------------------------------------------
app.use(notFoundHandler);
app.use(errorHandler);

// ----------------------------------------------------------------
// Sunucu başlatma — önce dinle, sonra DB bağlantısını doğrula
// ----------------------------------------------------------------
function start() {
  app.listen(env.app.port, () => {
    console.log(`🚀 Sunucu çalışıyor: http://localhost:${env.app.port}`);
    console.log(`📖 Swagger: http://localhost:${env.app.port}/api/v1/docs`);

    testConnection()
      .then(() => {
        dbReady = true;
        console.log('✅ Veritabanı bağlantısı kuruldu (mysql2 + Sequelize)');
      })
      .catch((err) => {
        console.error('⚠️  Veritabanı bağlantısı başarısız:', err.message);
      });
  });
}

start();

module.exports = app;
