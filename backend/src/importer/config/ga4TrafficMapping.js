'use strict';

// GA4 session-scoped trafik verisi
// Kritik: date INT (20241001) → DATE dönüşümü transformer.js'de yapılır
// Kritik: bu tablo ga4_item_interactions ile aynı sorguda JOIN yapılamaz (GA4 API kısıtı)
module.exports = {
  sourceName: 'ga4_traffic',
  rawTable: 'raw_ga4_traffic',
  cleanTable: 'ga4_traffic',
  fileFormats: ['csv'],
  duplicateStrategy: 'date_range',

  // CSV sütun adı → raw tablo sütun adı (raw tablo camelCase tutar)
  rawColumns: [
    'date', 'sessionSource', 'sessionMedium', 'sessionCampaignName',
    'sessionDefaultChannelGroup', 'deviceCategory', 'city',
    'landingPagePlusQueryString', 'newVsReturning', 'sessions',
    'totalUsers', 'newUsers', 'bounceRate', 'averageSessionDuration',
    'screenPageViewsPerSession', 'engagedSessions', 'engagementRate',
    'userEngagementDuration', 'conversions', 'purchaseRevenue', 'transactions',
  ],

  // CSV → clean DB sütun eşlemesi
  columns: [
    { csv: 'date',                         db: 'date',                           type: 'date',    required: true  },
    { csv: 'sessionSource',                db: 'session_source',                 type: 'string',  required: true  },
    { csv: 'sessionMedium',                db: 'session_medium',                 type: 'string',  required: true  },
    { csv: 'sessionCampaignName',          db: 'session_campaign_name',          type: 'string',  required: false },
    { csv: 'sessionDefaultChannelGroup',   db: 'session_default_channel_group',  type: 'string',  required: false },
    { csv: 'deviceCategory',               db: 'device_category',                type: 'string',  required: false },
    { csv: 'city',                         db: 'city',                           type: 'string',  required: false },
    { csv: 'landingPagePlusQueryString',   db: 'landing_page',                   type: 'string',  required: false },
    { csv: 'newVsReturning',               db: 'new_vs_returning',               type: 'string',  required: false },
    { csv: 'sessions',                     db: 'sessions',                       type: 'int',     required: true  },
    { csv: 'totalUsers',                   db: 'total_users',                    type: 'int',     required: false },
    { csv: 'newUsers',                     db: 'new_users',                      type: 'int',     required: false },
    { csv: 'bounceRate',                   db: 'bounce_rate',                    type: 'decimal', required: false },
    { csv: 'averageSessionDuration',       db: 'avg_session_duration',           type: 'decimal', required: false },
    { csv: 'screenPageViewsPerSession',    db: 'pages_per_session',              type: 'decimal', required: false },
    { csv: 'engagedSessions',              db: 'engaged_sessions',               type: 'int',     required: false },
    { csv: 'engagementRate',               db: 'engagement_rate',                type: 'decimal', required: false },
    { csv: 'userEngagementDuration',       db: 'user_engagement_duration',       type: 'decimal', required: false },
    { csv: 'conversions',                  db: 'conversions',                    type: 'int',     required: false },
    { csv: 'purchaseRevenue',              db: 'purchase_revenue',               type: 'decimal', required: false },
    { csv: 'transactions',                 db: 'transactions',                   type: 'int',     required: false },
  ],

  requiredFields: ['date', 'session_source', 'session_medium', 'sessions'],
  fkChecks: [],
  softFkChecks: [],
};
