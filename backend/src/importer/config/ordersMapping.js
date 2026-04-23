'use strict';

// Sipariş verisi — dönüşüm yok, veri zaten temiz
// Özel kontroller: customer_id hard FK, campaign_name soft FK, source+medium soft FK
module.exports = {
  sourceName: 'orders',
  rawTable: null,       // orders için raw tablo yok — direkt clean tabloya yazılır
  cleanTable: 'orders',
  fileFormats: ['csv'],
  duplicateStrategy: 'pk', // order_id PK zaten unique

  rawColumns: null,

  columns: [
    { csv: 'order_id',       db: 'order_id',       type: 'string',   required: true  },
    { csv: 'order_date',     db: 'order_date',      type: 'datetime', required: true  },
    { csv: 'customer_id',    db: 'customer_id',     type: 'string',   required: true  },
    { csv: 'city',           db: 'city',            type: 'string',   required: false },
    { csv: 'device',         db: 'device',          type: 'string',   required: false },
    { csv: 'channel',        db: 'channel',         type: 'string',   required: false },
    { csv: 'source',         db: 'source',          type: 'string',   required: false },
    { csv: 'medium',         db: 'medium',          type: 'string',   required: false },
    { csv: 'campaign_name',  db: 'campaign_name',   type: 'string',   required: false },
    { csv: 'coupon_code',    db: 'coupon_code',     type: 'string',   required: false },
    { csv: 'product_count',  db: 'product_count',   type: 'int',      required: false },
    { csv: 'order_revenue',  db: 'order_revenue',   type: 'decimal',  required: true  },
    { csv: 'shipping_cost',  db: 'shipping_cost',   type: 'decimal',  required: false },
    { csv: 'discount_amount',db: 'discount_amount', type: 'decimal',  required: false },
    { csv: 'refund_amount',  db: 'refund_amount',   type: 'decimal',  required: false },
    { csv: 'net_revenue',    db: 'net_revenue',     type: 'decimal',  required: true  },
    { csv: 'order_status',   db: 'order_status',    type: 'string',   required: false },
    { csv: 'payment_method', db: 'payment_method',  type: 'string',   required: false },
  ],

  requiredFields: ['order_id', 'order_date', 'customer_id', 'order_revenue', 'net_revenue'],
  fkChecks: [
    // customer_id hard FK — eşleşmeme import_errors'a yazılır
    { dbCol: 'customer_id', refTable: 'customers', refCol: 'customer_id', severity: 'hard' },
  ],
  softFkChecks: [
    // campaign_name soft — organic'te NULL olabilir
    { dbCol: 'campaign_name', refTable: 'campaigns', refCol: 'campaign_name', severity: 'soft' },
    // source+medium soft — yeni kaynak gelince mapping eksik olabilir
    { dbCols: ['source', 'medium'], refTable: 'channel_mapping', refCols: ['source', 'medium'], severity: 'soft' },
  ],
};
