'use strict';

const { pool } = require('../config/database');

function requestLogger(req, res, next) {
  const start = Date.now();

  res.on('finish', async () => {
    try {
      const responseTime = Date.now() - start;
      const userId = req.user ? req.user.id : null;

      // request_body'den şifreyi çıkar
      let requestBody = null;
      if (req.body && Object.keys(req.body).length > 0) {
        const sanitized = { ...req.body };
        delete sanitized.password;
        requestBody = JSON.stringify(sanitized);
      }

      await pool.execute(
        `INSERT INTO api_logs (user_id, method, endpoint, status_code, request_body, response_time, ip_address, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          req.method,
          req.originalUrl.substring(0, 500),
          res.statusCode,
          requestBody,
          responseTime,
          req.ip || req.socket?.remoteAddress || null,
          res.statusCode >= 400 ? res.locals.errorMessage || null : null,
        ]
      );
    } catch {
      // Logger hatası asla isteği engellemez
    }
  });

  next();
}

module.exports = requestLogger;
