'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { error } = require('../utils/formatters');

function verifyToken(req, res, next) {
  const header = req.headers['authorization'];
  const token = header && header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json(error('UNAUTHORIZED', 'Token gerekli'));
  }

  try {
    req.user = jwt.verify(token, env.jwt.secret);
    next();
  } catch {
    return res.status(401).json(error('INVALID_TOKEN', 'Geçersiz veya süresi dolmuş token'));
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(error('UNAUTHORIZED', 'Token gerekli'));
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json(error('FORBIDDEN', `Bu işlem için yetkiniz yok. Gerekli rol: ${roles.join(' veya ')}`));
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
