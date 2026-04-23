'use strict';

const { pool }           = require('../config/database');
const { success, error } = require('../utils/formatters');
const { auditLog }       = require('../utils/auditLogger');

/**
 * GET /api/v1/mappings/channels
 */
async function listChannels(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT source, medium, channel_group FROM channel_mapping ORDER BY channel_group, source');
    res.json(success(rows, { total: rows.length }));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/mappings/channels
 * Body: { source, medium, channel_group }
 */
async function createChannel(req, res, next) {
  try {
    const { source, medium, channel_group } = req.body;
    if (!source || !medium || !channel_group) {
      return res.status(400).json(error('VALIDATION_ERROR', 'source, medium ve channel_group zorunlu'));
    }

    const [[exists]] = await pool.query(
      'SELECT source FROM channel_mapping WHERE source = ? AND medium = ?',
      [source, medium]
    );
    if (exists) {
      return res.status(409).json(error('DUPLICATE', `(${source}, ${medium}) zaten mevcut`));
    }

    await pool.query(
      'INSERT INTO channel_mapping (source, medium, channel_group) VALUES (?, ?, ?)',
      [source, medium, channel_group]
    );

    await auditLog({ userId: req.user.id, action: 'CHANNEL_MAPPING_CREATE', tableName: 'channel_mapping', newValue: { source, medium, channel_group }, ipAddress: req.ip });

    res.status(201).json(success({ source, medium, channel_group }));
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/v1/mappings/channels/:source/:medium
 * Body: { channel_group }
 */
async function updateChannel(req, res, next) {
  try {
    const { source, medium } = req.params;
    const { channel_group } = req.body;
    if (!channel_group) {
      return res.status(400).json(error('VALIDATION_ERROR', 'channel_group zorunlu'));
    }

    const [[row]] = await pool.query(
      'SELECT channel_group FROM channel_mapping WHERE source = ? AND medium = ?',
      [source, medium]
    );
    if (!row) return res.status(404).json(error('NOT_FOUND', 'Kanal mapping bulunamadı'));

    await pool.query(
      'UPDATE channel_mapping SET channel_group = ? WHERE source = ? AND medium = ?',
      [channel_group, source, medium]
    );

    await auditLog({ userId: req.user.id, action: 'CHANNEL_MAPPING_UPDATE', tableName: 'channel_mapping', oldValue: row, newValue: { source, medium, channel_group }, ipAddress: req.ip });

    res.json(success({ source, medium, channel_group }));
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/mappings/channels/:source/:medium
 */
async function deleteChannel(req, res, next) {
  try {
    const { source, medium } = req.params;

    const [[row]] = await pool.query(
      'SELECT channel_group FROM channel_mapping WHERE source = ? AND medium = ?',
      [source, medium]
    );
    if (!row) return res.status(404).json(error('NOT_FOUND', 'Kanal mapping bulunamadı'));

    await pool.query(
      'DELETE FROM channel_mapping WHERE source = ? AND medium = ?',
      [source, medium]
    );

    await auditLog({ userId: req.user.id, action: 'CHANNEL_MAPPING_DELETE', tableName: 'channel_mapping', oldValue: row, ipAddress: req.ip });

    res.json(success({ message: 'Silindi', source, medium }));
  } catch (err) {
    next(err);
  }
}

module.exports = { listChannels, createChannel, updateChannel, deleteChannel };
