'use strict';

// Meta Ads placement/device kırılımı — dönüşüm yok, veri zaten temiz
module.exports = {
  sourceName: 'meta_ads_breakdowns',
  rawTable: 'raw_meta_ads_breakdowns',
  cleanTable: 'meta_ads_breakdowns',
  fileFormats: ['csv'],
  duplicateStrategy: 'date_range',

  rawColumns: [
    'date_start', 'campaign_name', 'adset_name', 'ad_name',
    'publisher_platform', 'platform_position', 'impression_device',
    'impressions', 'clicks', 'spend',
  ],

  columns: [
    { csv: 'date_start',          db: 'date',                 type: 'date',    required: true  },
    { csv: 'campaign_name',       db: 'campaign_name',        type: 'string',  required: true  },
    { csv: 'adset_name',          db: 'adset_name',           type: 'string',  required: false },
    { csv: 'ad_name',             db: 'ad_name',              type: 'string',  required: false },
    { csv: 'publisher_platform',  db: 'publisher_platform',   type: 'string',  required: false },
    { csv: 'platform_position',   db: 'platform_position',    type: 'string',  required: false },
    { csv: 'impression_device',   db: 'impression_device',    type: 'string',  required: false },
    { csv: 'impressions',         db: 'impressions',          type: 'int',     required: false },
    { csv: 'clicks',              db: 'clicks',               type: 'int',     required: false },
    { csv: 'spend',               db: 'spend',                type: 'decimal', required: false },
  ],

  requiredFields: ['date', 'campaign_name'],
  fkChecks: [
    { dbCol: 'campaign_name', refTable: 'campaigns', refCol: 'campaign_name', severity: 'hard' },
  ],
  softFkChecks: [],
};
