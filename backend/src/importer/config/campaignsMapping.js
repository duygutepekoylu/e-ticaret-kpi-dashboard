'use strict';

// Kampanya master verisi — dönüşüm yok, upsert mantığı
// campaign_name tüm platformlar arası join key — bu tablonun tutarlılığı kritik
module.exports = {
  sourceName: 'campaigns',
  rawTable: null,
  cleanTable: 'campaigns',
  fileFormats: ['csv', 'xlsx'],
  duplicateStrategy: 'upsert',

  rawColumns: null,

  columns: [
    { csv: 'campaign_name',    db: 'campaign_name',    type: 'string',  required: true  },
    { csv: 'platform',         db: 'platform',         type: 'string',  required: true  },
    { csv: 'campaign_type',    db: 'campaign_type',    type: 'string',  required: false },
    { csv: 'objective',        db: 'objective',        type: 'string',  required: false },
    { csv: 'start_date',       db: 'start_date',       type: 'date',    required: false },
    { csv: 'end_date',         db: 'end_date',         type: 'date',    required: false },
    { csv: 'daily_budget',     db: 'daily_budget',     type: 'decimal', required: false },
    { csv: 'total_budget',     db: 'total_budget',     type: 'decimal', required: false },
    { csv: 'target_audience',  db: 'target_audience',  type: 'string',  required: false },
    { csv: 'status',           db: 'status',           type: 'string',  required: false },
  ],

  requiredFields: ['campaign_name', 'platform'],
  fkChecks: [],
  softFkChecks: [],
};
