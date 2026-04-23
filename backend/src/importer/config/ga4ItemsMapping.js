'use strict';

// GA4 item-scoped etkileşim verisi
// Kritik: ga4_traffic ile AYNI SORGUDA birleştirilemez (GA4 API kısıtı, farklı boyut kapsamları)
module.exports = {
  sourceName: 'ga4_item_interactions',
  rawTable: 'raw_ga4_item_interactions',
  cleanTable: 'ga4_item_interactions',
  fileFormats: ['csv'],
  duplicateStrategy: 'date_range',

  rawColumns: [
    'date', 'itemId', 'itemName', 'itemCategory', 'itemCategory2',
    'itemBrand', 'itemsViewed', 'itemsAddedToCart', 'itemsCheckedOut',
    'itemsPurchased', 'itemRevenue', 'itemListViews', 'itemListClicks',
    'cartToViewRate',
  ],

  columns: [
    { csv: 'date',               db: 'date',                 type: 'date',    required: true  },
    { csv: 'itemId',             db: 'item_id',              type: 'string',  required: true  },
    { csv: 'itemName',           db: 'item_name',            type: 'string',  required: false },
    { csv: 'itemCategory',       db: 'item_category',        type: 'string',  required: false },
    { csv: 'itemCategory2',      db: 'item_category2',       type: 'string',  required: false },
    { csv: 'itemBrand',          db: 'item_brand',           type: 'string',  required: false },
    { csv: 'itemsViewed',        db: 'items_viewed',         type: 'int',     required: false },
    { csv: 'itemsAddedToCart',   db: 'items_added_to_cart',  type: 'int',     required: false },
    { csv: 'itemsCheckedOut',    db: 'items_checked_out',    type: 'int',     required: false },
    { csv: 'itemsPurchased',     db: 'items_purchased',      type: 'int',     required: false },
    { csv: 'itemRevenue',        db: 'item_revenue',         type: 'decimal', required: false },
    { csv: 'itemListViews',      db: 'item_list_views',      type: 'int',     required: false },
    { csv: 'itemListClicks',     db: 'item_list_clicks',     type: 'int',     required: false },
    { csv: 'cartToViewRate',     db: 'cart_to_view_rate',    type: 'decimal', required: false },
  ],

  requiredFields: ['date', 'item_id'],
  fkChecks: [
    // item_id → products.sku — eşleşmeme import_errors'a yazılır, import devam eder
    { dbCol: 'item_id', refTable: 'products', refCol: 'sku', severity: 'hard' },
  ],
  softFkChecks: [],
};
