'use strict';

const { error } = require('../utils/formatters');

function errorHandler(err, req, res, next) {
  res.locals.errorMessage = err.message;

  if (err.status === 404 || err.code === 'NOT_FOUND') {
    return res.status(404).json(error('NOT_FOUND', err.message || 'Kayıt bulunamadı'));
  }

  if (err.status === 400 || err.code === 'VALIDATION_ERROR') {
    return res.status(400).json(error('VALIDATION_ERROR', err.message));
  }

  if (err.status === 401) {
    return res.status(401).json(error('UNAUTHORIZED', err.message || 'Yetkisiz erişim'));
  }

  if (err.status === 403) {
    return res.status(403).json(error('FORBIDDEN', err.message || 'Erişim reddedildi'));
  }

  console.error('[ErrorHandler]', err);
  return res.status(500).json(error('SERVER_ERROR', 'Sunucu hatası oluştu'));
}

function notFoundHandler(req, res) {
  res.status(404).json(error('NOT_FOUND', `Route bulunamadı: ${req.method} ${req.originalUrl}`));
}

module.exports = { errorHandler, notFoundHandler };
