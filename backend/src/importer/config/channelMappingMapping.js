'use strict';

// Kanal eşleme tablosu — source+medium → channel_group
// Composite PK: (source, medium)
module.exports = {
  sourceName: 'channel_mapping',
  rawTable: null,
  cleanTable: 'channel_mapping',
  fileFormats: ['csv'],
  duplicateStrategy: 'upsert',

  rawColumns: null,

  columns: [
    { csv: 'source',        db: 'source',        type: 'string', required: true },
    { csv: 'medium',        db: 'medium',         type: 'string', required: true },
    { csv: 'channel_group', db: 'channel_group',  type: 'string', required: true },
  ],

  requiredFields: ['source', 'medium', 'channel_group'],
  fkChecks: [],
  softFkChecks: [],
};
