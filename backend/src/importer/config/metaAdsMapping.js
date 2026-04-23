'use strict';

// Meta Ads kampanya verisi
// Kritik: ctr ve inline_link_click_ctr yüzde olarak gelir → transformer.js ÷100 yapar (2.25 → 0.0225)
// Raw tabloda tüm metrik sütunları VARCHAR — dönüşüm transformer.js'de yapılır
module.exports = {
  sourceName: 'meta_ads',
  rawTable: 'raw_meta_ads',
  cleanTable: 'meta_ads',
  fileFormats: ['csv'],
  duplicateStrategy: 'date_range',

  // CSV başlıkları → raw tablo sütun adları (raw tabloda prefix temizlenmiş hali)
  rawColumns: [
    'date_start', 'date_stop', 'account_id', 'account_name', 'campaign_id',
    'campaign_name', 'adset_id', 'adset_name', 'ad_id', 'ad_name',
    'objective', 'buying_type', 'impressions', 'reach', 'frequency',
    'clicks', 'inline_link_clicks', 'spend', 'cpc', 'cpm', 'cpp', 'ctr',
    'inline_link_click_ctr',
    'actions_link_click', 'actions_landing_page_view',
    'actions_fb_pixel_view_content', 'actions_fb_pixel_add_to_cart',
    'actions_fb_pixel_initiate_checkout', 'actions_fb_pixel_purchase',
    'action_values_fb_pixel_purchase',
    'actions_page_engagement', 'actions_post_engagement', 'actions_video_view',
  ],

  columns: [
    { csv: 'date_start',                                      db: 'date',                       type: 'date',    required: true  },
    { csv: 'account_id',                                      db: 'account_id',                 type: 'string',  required: false },
    { csv: 'account_name',                                    db: 'account_name',               type: 'string',  required: false },
    { csv: 'campaign_id',                                     db: 'campaign_id',                type: 'string',  required: false },
    { csv: 'campaign_name',                                   db: 'campaign_name',              type: 'string',  required: true  },
    { csv: 'adset_id',                                        db: 'adset_id',                   type: 'string',  required: false },
    { csv: 'adset_name',                                      db: 'adset_name',                 type: 'string',  required: false },
    { csv: 'ad_id',                                           db: 'ad_id',                      type: 'string',  required: true  },
    { csv: 'ad_name',                                         db: 'ad_name',                    type: 'string',  required: false },
    { csv: 'objective',                                       db: 'objective',                  type: 'string',  required: false },
    { csv: 'buying_type',                                     db: 'buying_type',                type: 'string',  required: false },
    { csv: 'impressions',                                     db: 'impressions',                type: 'int',     required: false },
    { csv: 'reach',                                           db: 'reach',                      type: 'int',     required: false },
    { csv: 'frequency',                                       db: 'frequency',                  type: 'decimal', required: false },
    { csv: 'clicks',                                          db: 'clicks',                     type: 'int',     required: false },
    { csv: 'inline_link_clicks',                              db: 'inline_link_clicks',         type: 'int',     required: false },
    { csv: 'spend',                                           db: 'spend',                      type: 'decimal', required: false },
    { csv: 'cpc',                                             db: 'cpc',                        type: 'decimal', required: false },
    { csv: 'cpm',                                             db: 'cpm',                        type: 'decimal', required: false },
    { csv: 'cpp',                                             db: 'cpp',                        type: 'decimal', required: false },
    { csv: 'ctr',                                             db: 'ctr',                        type: 'decimal', required: false },
    { csv: 'inline_link_click_ctr',                           db: 'inline_link_click_ctr',      type: 'decimal', required: false },
    { csv: 'actions_link_click',                              db: 'action_link_click',          type: 'int',     required: false },
    { csv: 'actions_landing_page_view',                       db: 'action_landing_page_view',   type: 'int',     required: false },
    { csv: 'actions_fb_pixel_view_content',                   db: 'pixel_view_content',         type: 'int',     required: false },
    { csv: 'actions_fb_pixel_add_to_cart',                    db: 'pixel_add_to_cart',          type: 'int',     required: false },
    { csv: 'actions_fb_pixel_initiate_checkout',              db: 'pixel_initiate_checkout',    type: 'int',     required: false },
    { csv: 'actions_fb_pixel_purchase',                       db: 'pixel_purchase',             type: 'int',     required: false },
    { csv: 'action_values_fb_pixel_purchase',                 db: 'pixel_purchase_value',       type: 'decimal', required: false },
    { csv: 'actions_page_engagement',                         db: 'action_page_engagement',     type: 'int',     required: false },
    { csv: 'actions_post_engagement',                         db: 'action_post_engagement',     type: 'int',     required: false },
    { csv: 'actions_video_view',                              db: 'action_video_view',          type: 'int',     required: false },
  ],

  requiredFields: ['date', 'campaign_name', 'ad_id'],
  fkChecks: [
    { dbCol: 'campaign_name', refTable: 'campaigns', refCol: 'campaign_name', severity: 'hard' },
  ],
  softFkChecks: [],
};
