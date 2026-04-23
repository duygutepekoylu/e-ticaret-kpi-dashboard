'use strict';

// Müşteri master verisi — dönüşüm yok, upsert mantığı
module.exports = {
  sourceName: 'customers',
  rawTable: null,
  cleanTable: 'customers',
  fileFormats: ['csv', 'xlsx'],
  duplicateStrategy: 'upsert',

  rawColumns: null,

  columns: [
    { csv: 'customer_id',              db: 'customer_id',              type: 'string',  required: true  },
    { csv: 'customer_name',            db: 'customer_name',            type: 'string',  required: true  },
    { csv: 'first_order_date',         db: 'first_order_date',         type: 'date',    required: false },
    { csv: 'registration_date',        db: 'registration_date',        type: 'date',    required: true  },
    { csv: 'city',                     db: 'city',                     type: 'string',  required: false },
    { csv: 'gender',                   db: 'gender',                   type: 'string',  required: false },
    { csv: 'age_group',                db: 'age_group',                type: 'string',  required: false },
    { csv: 'registration_source',      db: 'registration_source',      type: 'string',  required: false },
    { csv: 'is_newsletter_subscriber', db: 'is_newsletter_subscriber', type: 'int',     required: false },
    { csv: 'total_orders',             db: 'total_orders',             type: 'int',     required: false },
    { csv: 'total_revenue',            db: 'total_revenue',            type: 'decimal', required: false },
    { csv: 'last_order_date',          db: 'last_order_date',          type: 'date',    required: false },
  ],

  requiredFields: ['customer_id', 'registration_date'],
  fkChecks: [],
  softFkChecks: [],
};
