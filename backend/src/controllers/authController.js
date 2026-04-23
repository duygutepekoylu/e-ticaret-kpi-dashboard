'use strict';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const env    = require('../config/env');
const userModel = require('../models/user');
const { success, error } = require('../utils/formatters');
const { auditLog } = require('../utils/auditLogger');

/**
 * POST /api/v1/auth/login
 * Body: { email, password }
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json(error('VALIDATION_ERROR', 'email ve password zorunlu'));
    }

    const user = await userModel.findByEmail(email);
    if (!user) {
      return res.status(401).json(error('INVALID_CREDENTIALS', 'E-posta veya şifre hatalı'));
    }

    if (!user.is_active) {
      return res.status(401).json(error('ACCOUNT_DISABLED', 'Hesabınız devre dışı'));
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json(error('INVALID_CREDENTIALS', 'E-posta veya şifre hatalı'));
    }

    const payload = { id: user.id, email: user.email, role: user.role, fullName: user.full_name };
    const token = jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });

    await userModel.updateLastLogin(user.id);
    await auditLog({ userId: user.id, action: 'LOGIN', ipAddress: req.ip });

    res.json(success({ token, user: payload }));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/logout
 * JWT stateless — sadece audit log kaydı
 */
async function logout(req, res, next) {
  try {
    if (req.user) {
      await auditLog({ userId: req.user.id, action: 'LOGOUT', ipAddress: req.ip });
    }
    res.json(success({ message: 'Çıkış yapıldı' }));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/auth/me
 * Token'dan okunan kullanıcı bilgisi (verifyToken middleware sonrası)
 */
async function me(req, res, next) {
  try {
    const user = await userModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json(error('NOT_FOUND', 'Kullanıcı bulunamadı'));
    }
    res.json(success({ user }));
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, me };
