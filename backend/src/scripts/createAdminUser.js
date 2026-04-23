'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const bcrypt    = require('bcryptjs');
const { pool }  = require('../config/database');
const userModel = require('../models/user');

const EMAIL    = process.env.ADMIN_EMAIL    || 'admin@sporthink.com';
const PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const NAME     = process.env.ADMIN_NAME     || 'Admin';

async function main() {
  const existing = await userModel.findByEmail(EMAIL);
  if (existing) {
    console.log(`✓ Admin zaten mevcut: ${EMAIL} (id: ${existing.id})`);
    return;
  }
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const id = await userModel.create({ email: EMAIL, passwordHash, fullName: NAME, role: 'admin' });
  console.log(`✅ Admin oluşturuldu → id: ${id}, email: ${EMAIL}, şifre: ${PASSWORD}`);
}

main()
  .catch(e => { console.error('Hata:', e.message); process.exit(1); })
  .finally(() => pool.end());
