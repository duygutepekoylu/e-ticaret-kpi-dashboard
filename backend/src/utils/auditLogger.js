'use strict';

const { pool } = require('../config/database');

async function auditLog({ userId, action, tableName = null, recordId = null, oldValue = null, newValue = null, ipAddress = null }) {
  try {
    await pool.execute(
      `INSERT INTO audit_logs (user_id, action, table_name, record_id, old_value, new_value, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        action,
        tableName,
        recordId ? String(recordId) : null,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        ipAddress,
      ]
    );
  } catch (err) {
    console.error('[AuditLogger] Kayıt yazılamadı:', err.message);
  }
}

module.exports = { auditLog };
