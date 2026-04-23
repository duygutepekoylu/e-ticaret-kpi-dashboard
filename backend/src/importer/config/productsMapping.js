'use strict';

// Ürün master verisi — dönüşüm yok, upsert mantığı (PK sku üzerinden)
module.exports = {
  sourceName: 'products',
  rawTable: null,
  cleanTable: 'products',
  fileFormats: ['csv', 'xlsx'],
  duplicateStrategy: 'upsert', // sku PK — var ise güncelle, yok ise ekle

  rawColumns: null,

  columns: [
    { csv: 'sku',            db: 'sku',            type: 'string',  required: true  },
    { csv: 'product_name',   db: 'product_name',   type: 'string',  required: true  },
    { csv: 'category',       db: 'category',       type: 'string',  required: true  },
    { csv: 'sub_category',   db: 'sub_category',   type: 'string',  required: false },
    { csv: 'brand',          db: 'brand',          type: 'string',  required: false },
    { csv: 'gender',         db: 'gender',         type: 'string',  required: false },
    { csv: 'price',          db: 'price',          type: 'decimal', required: false },
    { csv: 'cost_price',     db: 'cost_price',     type: 'decimal', required: false },
    { csv: 'stock_quantity', db: 'stock_quantity', type: 'int',     required: false },
    { csv: 'is_active',      db: 'is_active',      type: 'int',     required: false },
    { csv: 'created_at',     db: 'created_at',     type: 'date',    required: false },
    { csv: 'color',          db: 'color',          type: 'string',  required: false },
    { csv: 'size_range',     db: 'size_range',     type: 'string',  required: false },
  ],

  requiredFields: ['sku', 'product_name', 'category'],
  fkChecks: [],
  softFkChecks: [],
};
