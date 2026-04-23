'use strict';

// Google Ads kampanya/ürün verisi
// Kritik: cost_micros, average_cpc, average_cpm, cost_per_conversion mikro birim → transformer.js ÷1.000.000
// Kritik: product_item_id nullable — Search kampanyalarında NULL gelir, LEFT JOIN kullan
// CSV başlıklarında noktalı sütun adları (segments.date) → raw tabloda aynen saklanır
module.exports = {
  sourceName: 'google_ads',
  rawTable: 'raw_google_ads',
  cleanTable: 'google_ads',
  fileFormats: ['csv'],
  duplicateStrategy: 'date_range',

  // Raw tablo sütun adları (noktalı — CSV'den aynen aktarılır)
  rawColumns: [
    'segments.date', 'customer.id', 'customer.descriptive_name',
    'campaign.id', 'campaign.name', 'campaign.status',
    'campaign.advertising_channel_type', 'ad_group.id', 'ad_group.name',
    'ad_group.status', 'segments.device', 'segments.ad_network_type',
    'segments.product_item_id', 'segments.product_title',
    'segments.product_brand', 'segments.product_type_l1',
    'segments.product_type_l2', 'ad_group_criterion.keyword.text',
    'ad_group_criterion.keyword.match_type', 'metrics.impressions',
    'metrics.clicks', 'metrics.cost_micros', 'metrics.ctr',
    'metrics.average_cpc', 'metrics.average_cpm', 'metrics.conversions',
    'metrics.conversions_value', 'metrics.all_conversions',
    'metrics.all_conversions_value', 'metrics.cost_per_conversion',
    'metrics.conversions_from_interactions_rate', 'metrics.value_per_conversion',
    'metrics.search_impression_share', 'metrics.search_budget_lost_impression_share',
    'metrics.search_rank_lost_impression_share', 'metrics.view_through_conversions',
    'metrics.interaction_rate',
  ],

  columns: [
    { csv: 'segments.date',                                    db: 'date',                       type: 'date',    required: true  },
    { csv: 'customer.id',                                      db: 'customer_id',                type: 'string',  required: false },
    { csv: 'customer.descriptive_name',                        db: 'customer_name',              type: 'string',  required: false },
    { csv: 'campaign.id',                                      db: 'campaign_id',                type: 'string',  required: false },
    { csv: 'campaign.name',                                    db: 'campaign_name',              type: 'string',  required: true  },
    { csv: 'campaign.status',                                  db: 'campaign_status',            type: 'string',  required: false },
    { csv: 'campaign.advertising_channel_type',                db: 'channel_type',               type: 'string',  required: false },
    { csv: 'ad_group.id',                                      db: 'ad_group_id',                type: 'string',  required: false },
    { csv: 'ad_group.name',                                    db: 'ad_group_name',              type: 'string',  required: false },
    { csv: 'ad_group.status',                                  db: 'ad_group_status',            type: 'string',  required: false },
    { csv: 'segments.device',                                  db: 'device',                     type: 'string',  required: false },
    { csv: 'segments.ad_network_type',                         db: 'ad_network_type',            type: 'string',  required: false },
    { csv: 'segments.product_item_id',                         db: 'product_item_id',            type: 'string',  required: false },
    { csv: 'segments.product_title',                           db: 'product_title',              type: 'string',  required: false },
    { csv: 'segments.product_brand',                           db: 'product_brand',              type: 'string',  required: false },
    { csv: 'segments.product_type_l1',                         db: 'product_type_l1',            type: 'string',  required: false },
    { csv: 'segments.product_type_l2',                         db: 'product_type_l2',            type: 'string',  required: false },
    { csv: 'ad_group_criterion.keyword.text',                  db: 'keyword_text',               type: 'string',  required: false },
    { csv: 'ad_group_criterion.keyword.match_type',            db: 'keyword_match_type',         type: 'string',  required: false },
    { csv: 'metrics.impressions',                              db: 'impressions',                type: 'int',     required: false },
    { csv: 'metrics.clicks',                                   db: 'clicks',                     type: 'int',     required: false },
    { csv: 'metrics.cost_micros',                              db: 'cost_tl',                    type: 'decimal', required: false },
    { csv: 'metrics.ctr',                                      db: 'ctr',                        type: 'decimal', required: false },
    { csv: 'metrics.average_cpc',                              db: 'avg_cpc_tl',                 type: 'decimal', required: false },
    { csv: 'metrics.average_cpm',                              db: 'avg_cpm_tl',                 type: 'decimal', required: false },
    { csv: 'metrics.conversions',                              db: 'conversions',                type: 'decimal', required: false },
    { csv: 'metrics.conversions_value',                        db: 'conversions_value',          type: 'decimal', required: false },
    { csv: 'metrics.all_conversions',                          db: 'all_conversions',            type: 'decimal', required: false },
    { csv: 'metrics.all_conversions_value',                    db: 'all_conversions_value',      type: 'decimal', required: false },
    { csv: 'metrics.cost_per_conversion',                      db: 'cost_per_conversion_tl',     type: 'decimal', required: false },
    { csv: 'metrics.conversions_from_interactions_rate',       db: 'conversion_rate',            type: 'decimal', required: false },
    { csv: 'metrics.value_per_conversion',                     db: 'value_per_conversion',       type: 'decimal', required: false },
    { csv: 'metrics.search_impression_share',                  db: 'search_impression_share',    type: 'decimal', required: false },
    { csv: 'metrics.search_budget_lost_impression_share',      db: 'search_budget_lost_is',      type: 'decimal', required: false },
    { csv: 'metrics.search_rank_lost_impression_share',        db: 'search_rank_lost_is',        type: 'decimal', required: false },
    { csv: 'metrics.view_through_conversions',                 db: 'view_through_conversions',   type: 'int',     required: false },
    { csv: 'metrics.interaction_rate',                         db: 'interaction_rate',           type: 'decimal', required: false },
  ],

  requiredFields: ['date', 'campaign_name'],
  fkChecks: [
    { dbCol: 'campaign_name', refTable: 'campaigns', refCol: 'campaign_name', severity: 'hard' },
    // product_item_id nullable — eşleşmeme hata değil, sadece uyarı
    { dbCol: 'product_item_id', refTable: 'products', refCol: 'sku', severity: 'soft', nullable: true },
  ],
  softFkChecks: [],
};
