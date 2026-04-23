'use strict';

// Sipariş kalemleri — dönüşüm yok
module.exports = {
  sourceName: 'order_items',
  rawTable: null,
  cleanTable: 'order_items',
  fileFormats: ['csv'],
  duplicateStrategy: 'pk', // (order_id, line_id) composite PK

  rawColumns: null,

  columns: [
    { csv: 'order_id',       db: 'order_id',       type: 'string',  required: true  },
    { csv: 'line_id',        db: 'line_id',         type: 'int',     required: true  },
    { csv: 'item_id',        db: 'item_id',         type: 'string',  required: true  },
    { csv: 'item_name',      db: 'item_name',       type: 'string',  required: false },
    { csv: 'item_category',  db: 'item_category',   type: 'string',  required: false },
    { csv: 'item_category2', db: 'item_category2',  type: 'string',  required: false },
    { csv: 'item_brand',     db: 'item_brand',      type: 'string',  required: false },
    { csv: 'quantity',       db: 'quantity',        type: 'int',     required: false },
    { csv: 'unit_price',     db: 'unit_price',      type: 'decimal', required: false },
    { csv: 'line_total',     db: 'line_total',      type: 'decimal', required: false },
    { csv: 'discount_amount',db: 'discount_amount', type: 'decimal', required: false },
    { csv: 'refund_amount',  db: 'refund_amount',   type: 'decimal', required: false },
  ],

  requiredFields: ['order_id', 'line_id', 'item_id'],
  fkChecks: [
    { dbCol: 'order_id', refTable: 'orders', refCol: 'order_id', severity: 'hard' },
    { dbCol: 'item_id',  refTable: 'products', refCol: 'sku',    severity: 'hard' },
  ],
  softFkChecks: [],
};
