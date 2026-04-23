'use strict';

// ─── Temel dönüşüm yardımcıları ───────────────────────────────────────────────

/**
 * GA4 integer tarih formatını DATE string'ine çevirir.
 * 20241001 → '2024-10-01'
 * Zaten YYYY-MM-DD formatlıysa dokunmaz.
 */
function transformGa4Date(value) {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).trim();
  if (/^\d{8}$/.test(str)) {
    return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
  }
  return str; // zaten DATE formatındaysa döndür
}

/**
 * Meta CTR yüzde değerini 0-1 aralığına dönüştürür.
 * 2.25 → 0.0225 (÷100)
 * Boş veya null → null
 */
function transformMetaCtr(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = parseFloat(value);
  if (isNaN(num)) return null;
  return parseFloat((num / 100).toFixed(6));
}

/**
 * Google Ads mikro birim değerini TL'ye çevirir.
 * 2800000000 → 2800.00 (÷1.000.000)
 * Boş veya null → null
 */
function transformGoogleMicros(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  if (isNaN(num)) return null;
  return parseFloat((num / 1_000_000).toFixed(4));
}

/**
 * Sayısal string'i güvenli şekilde sayıya çevirir.
 * Boş string ve null → null (DB default değerini kullanır)
 */
function toNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

/**
 * Sayısal string'i int'e çevirir; boş/null → 0 (NOT NULL DEFAULT 0 kolonlar için).
 */
function toInt(value) {
  if (value === null || value === undefined || value === '') return 0;
  const num = parseInt(value, 10);
  return isNaN(num) ? 0 : num;
}

// ─── Kaynak bazlı dönüşüm fonksiyonları ──────────────────────────────────────

/**
 * GA4 trafik satırını dönüştürür.
 * - date: int → DATE string
 * - sayısal alanlar: string → number
 */
function transformGa4TrafficRow(row) {
  return {
    ...row,
    date:                    transformGa4Date(row.date),
    sessions:                toNumber(row.sessions),
    totalUsers:              toNumber(row.totalUsers),
    newUsers:                toNumber(row.newUsers),
    bounceRate:              toNumber(row.bounceRate),
    averageSessionDuration:  toNumber(row.averageSessionDuration),
    screenPageViewsPerSession: toNumber(row.screenPageViewsPerSession),
    engagedSessions:         toNumber(row.engagedSessions),
    engagementRate:          toNumber(row.engagementRate),
    userEngagementDuration:  toNumber(row.userEngagementDuration),
    conversions:             toNumber(row.conversions),
    purchaseRevenue:         toNumber(row.purchaseRevenue),
    transactions:            toNumber(row.transactions),
  };
}

/**
 * GA4 item interactions satırını dönüştürür.
 */
function transformGa4ItemsRow(row) {
  return {
    ...row,
    date:               transformGa4Date(row.date),
    itemsViewed:        toNumber(row.itemsViewed),
    itemsAddedToCart:   toNumber(row.itemsAddedToCart),
    itemsCheckedOut:    toNumber(row.itemsCheckedOut),
    itemsPurchased:     toNumber(row.itemsPurchased),
    itemRevenue:        toNumber(row.itemRevenue),
    itemListViews:      toNumber(row.itemListViews),
    itemListClicks:     toNumber(row.itemListClicks),
    cartToViewRate:     toNumber(row.cartToViewRate),
  };
}

/**
 * Meta Ads satırını dönüştürür.
 * - ctr ve inline_link_click_ctr: yüzde → oran (÷100)
 * - Diğer sayısal alanlar: string → number (raw tabloda VARCHAR)
 */
function transformMetaAdsRow(row) {
  return {
    ...row,
    // NOT NULL DEFAULT 0 int kolonları → toInt (boş → 0)
    impressions:             toInt(row.impressions),
    reach:                   toInt(row.reach),
    clicks:                  toInt(row.clicks),
    inline_link_clicks:      toInt(row.inline_link_clicks),
    // nullable decimal kolonları → toNumber (boş → null)
    frequency:               toNumber(row.frequency),
    spend:                   toNumber(row.spend),
    cpc:                     toNumber(row.cpc),
    cpm:                     toNumber(row.cpm),
    cpp:                     toNumber(row.cpp),
    ctr:                     transformMetaCtr(row.ctr),
    inline_link_click_ctr:   transformMetaCtr(row.inline_link_click_ctr),
    // action int kolonları → toInt
    actions_link_click:                    toInt(row.actions_link_click),
    actions_landing_page_view:             toInt(row.actions_landing_page_view),
    actions_fb_pixel_view_content:         toInt(row.actions_fb_pixel_view_content),
    actions_fb_pixel_add_to_cart:          toInt(row.actions_fb_pixel_add_to_cart),
    actions_fb_pixel_initiate_checkout:    toInt(row.actions_fb_pixel_initiate_checkout),
    actions_fb_pixel_purchase:             toInt(row.actions_fb_pixel_purchase),
    // pixel_purchase_value: NOT NULL DEFAULT 0.00 — boş → 0
    action_values_fb_pixel_purchase:       toNumber(row.action_values_fb_pixel_purchase) ?? 0,
    actions_page_engagement:               toInt(row.actions_page_engagement),
    actions_post_engagement:               toInt(row.actions_post_engagement),
    actions_video_view:                    toInt(row.actions_video_view),
  };
}

/**
 * Meta Ads breakdowns satırını dönüştürür — sadece sayısal cast.
 */
function transformMetaBreakdownsRow(row) {
  return {
    ...row,
    impressions: toNumber(row.impressions),
    clicks:      toNumber(row.clicks),
    spend:       toNumber(row.spend),
  };
}

/**
 * Google Ads satırını dönüştürür.
 * - cost_micros, average_cpc, average_cpm, cost_per_conversion: mikro → TL (÷1.000.000)
 * - Diğer sayısal alanlar: cast
 */
function transformGoogleAdsRow(row) {
  return {
    ...row,
    'metrics.impressions':                        toNumber(row['metrics.impressions']),
    'metrics.clicks':                             toNumber(row['metrics.clicks']),
    'metrics.cost_micros':                        transformGoogleMicros(row['metrics.cost_micros']),
    'metrics.ctr':                                toNumber(row['metrics.ctr']),
    'metrics.average_cpc':                        transformGoogleMicros(row['metrics.average_cpc']),
    'metrics.average_cpm':                        transformGoogleMicros(row['metrics.average_cpm']),
    'metrics.conversions':                        toNumber(row['metrics.conversions']),
    'metrics.conversions_value':                  toNumber(row['metrics.conversions_value']),
    'metrics.all_conversions':                    toNumber(row['metrics.all_conversions']),
    'metrics.all_conversions_value':              toNumber(row['metrics.all_conversions_value']),
    'metrics.cost_per_conversion':                transformGoogleMicros(row['metrics.cost_per_conversion']),
    'metrics.conversions_from_interactions_rate': toNumber(row['metrics.conversions_from_interactions_rate']),
    'metrics.value_per_conversion':               toNumber(row['metrics.value_per_conversion']),
    'metrics.search_impression_share':            toNumber(row['metrics.search_impression_share']),
    'metrics.search_budget_lost_impression_share':toNumber(row['metrics.search_budget_lost_impression_share']),
    'metrics.search_rank_lost_impression_share':  toNumber(row['metrics.search_rank_lost_impression_share']),
    'metrics.view_through_conversions':           toNumber(row['metrics.view_through_conversions']),
    'metrics.interaction_rate':                   toNumber(row['metrics.interaction_rate']),
  };
}

/**
 * Sipariş satırını dönüştürür — sadece sayısal cast.
 */
function transformOrderRow(row) {
  return {
    ...row,
    product_count:   toNumber(row.product_count),
    order_revenue:   toNumber(row.order_revenue),
    shipping_cost:   toNumber(row.shipping_cost),
    discount_amount: toNumber(row.discount_amount),
    refund_amount:   toNumber(row.refund_amount),
    net_revenue:     toNumber(row.net_revenue),
  };
}

/**
 * Sipariş kalemi satırını dönüştürür.
 */
function transformOrderItemRow(row) {
  return {
    ...row,
    line_id:         toNumber(row.line_id),
    quantity:        toNumber(row.quantity),
    unit_price:      toNumber(row.unit_price),
    line_total:      toNumber(row.line_total),
    discount_amount: toNumber(row.discount_amount),
    refund_amount:   toNumber(row.refund_amount),
  };
}

// ─── Kaynak adına göre dönüşüm seçici ────────────────────────────────────────

const TRANSFORMERS = {
  ga4_traffic:            transformGa4TrafficRow,
  ga4_item_interactions:  transformGa4ItemsRow,
  meta_ads:               transformMetaAdsRow,
  meta_ads_breakdowns:    transformMetaBreakdownsRow,
  google_ads:             transformGoogleAdsRow,
  orders:                 transformOrderRow,
  order_items:            transformOrderItemRow,
  // products, customers, campaigns, channel_mapping — dönüşüm yok
};

/**
 * Tek bir CSV satırını kaynak tipine göre dönüştürür.
 * @param {object} row        - Ham CSV satırı
 * @param {string} sourceName - Mapping config'deki sourceName
 * @returns {object} Dönüştürülmüş satır
 */
function transformRow(row, sourceName) {
  const fn = TRANSFORMERS[sourceName];
  return fn ? fn(row) : { ...row };
}

/**
 * Tüm satırları toplu dönüştürür.
 * @param {object[]} rows
 * @param {string} sourceName
 * @returns {object[]}
 */
function transformRows(rows, sourceName) {
  return rows.map((row) => transformRow(row, sourceName));
}

module.exports = {
  transformRow,
  transformRows,
  transformGa4Date,
  transformMetaCtr,
  transformGoogleMicros,
  toNumber,
  toInt,
};
