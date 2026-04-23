'use strict';

const { pool } = require('../config/database');
const { success } = require('../utils/formatters');

/**
 * GET /api/v1/dashboard/trend
 * Zaman serisi: günlük sessions, revenue, spend, roas
 */
async function getTrend(req, res, next) {
  try {
    const { date_from, date_to } = req.query;
    const conditions = [];
    const params = [];
    if (date_from) { conditions.push('t.date >= ?'); params.push(date_from); }
    if (date_to)   { conditions.push('t.date <= ?'); params.push(date_to); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.execute(
      `SELECT
         t.date,
         t.sessions,
         t.total_users AS users,
         t.conversions,
         t.bounce_rate,
         s.net_revenue,
         s.total_orders,
         a.spend,
         a.revenue / NULLIF(a.spend, 0) AS roas
       FROM kpi_daily_traffic t
       LEFT JOIN kpi_daily_sales s ON t.date = s.date
       LEFT JOIN (
         SELECT date, SUM(spend) AS spend, SUM(revenue) AS revenue
         FROM kpi_daily_ads GROUP BY date
       ) a ON t.date = a.date
       ${where}
       ORDER BY t.date ASC`,
      params
    );

    res.json(success({ rows }, { total: rows.length }));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/dashboard/channel-performance
 * Kanal bazlı: sessions, revenue, roas, conversion_rate
 */
async function getChannelPerformance(req, res, next) {
  try {
    const { date_from, date_to } = req.query;
    const conditions = [];
    const params = [];
    if (date_from) { conditions.push('date >= ?'); params.push(date_from); }
    if (date_to)   { conditions.push('date <= ?'); params.push(date_to); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.execute(
      `SELECT
         channel_group,
         SUM(sessions)           AS sessions,
         SUM(orders)             AS orders,
         SUM(net_revenue)        AS revenue,
         SUM(spend)              AS spend,
         SUM(net_revenue) / NULLIF(SUM(spend), 0) AS roas,
         SUM(orders) / NULLIF(SUM(sessions), 0)   AS conversion_rate,
         SUM(net_revenue) / NULLIF(SUM(sessions), 0) AS revenue_per_session
       FROM agg_channel_performance
       ${where}
       GROUP BY channel_group
       ORDER BY revenue DESC`,
      params
    );

    res.json(success({ rows }, { total: rows.length }));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/dashboard/platform-performance
 * Platform (Meta vs Google) karşılaştırması
 */
async function getPlatformPerformance(req, res, next) {
  try {
    const { date_from, date_to } = req.query;
    const conditions = [];
    const params = [];
    if (date_from) { conditions.push('date >= ?'); params.push(date_from); }
    if (date_to)   { conditions.push('date <= ?'); params.push(date_to); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.execute(
      `SELECT
         platform,
         SUM(spend)       AS spend,
         SUM(impressions) AS impressions,
         SUM(clicks)      AS clicks,
         SUM(revenue)     AS revenue,
         SUM(revenue) / NULLIF(SUM(spend), 0)     AS roas,
         SUM(clicks) / NULLIF(SUM(impressions), 0) AS ctr
       FROM kpi_daily_ads
       ${where}
       GROUP BY platform
       ORDER BY spend DESC`,
      params
    );

    res.json(success({ rows }, { total: rows.length }));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/dashboard/campaign-performance
 * Kampanya bazlı: spend, revenue, roas, impressions, clicks
 * Query: date_from, date_to, platform
 */
async function getCampaignPerformance(req, res, next) {
  try {
    const { date_from, date_to, platform } = req.query;
    const conditions = [];
    const params = [];
    if (date_from) { conditions.push('date >= ?');     params.push(date_from); }
    if (date_to)   { conditions.push('date <= ?');     params.push(date_to); }
    if (platform)  { conditions.push('platform = ?');  params.push(platform); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.execute(
      `SELECT
         campaign_name,
         platform,
         SUM(spend)       AS spend,
         SUM(impressions) AS impressions,
         SUM(clicks)      AS clicks,
         SUM(revenue)     AS revenue,
         SUM(revenue) / NULLIF(SUM(spend), 0)      AS roas,
         SUM(clicks) / NULLIF(SUM(impressions), 0) AS ctr
       FROM agg_campaign_performance
       ${where}
       GROUP BY campaign_name, platform
       ORDER BY spend DESC`,
      params
    );

    res.json(success({ rows }, { total: rows.length }));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/dashboard/funnel
 * 6 adımlı satın alma hunisi
 * GA4 item_interactions + orders verisi
 */
async function getFunnel(req, res, next) {
  try {
    const { date_from, date_to } = req.query;
    const conditions = [];
    const params = [];
    if (date_from) { conditions.push('date >= ?'); params.push(date_from); }
    if (date_to)   { conditions.push('date <= ?'); params.push(date_to); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // GA4 item event'lerinden huni adımlarını topla
    // items_checked_out agg_product_performance'da yok — ga4_item_interactions'tan ayrı sorgu
    const [itemRows] = await pool.execute(
      `SELECT
         SUM(items_viewed)       AS view_item,
         SUM(items_added_to_cart) AS add_to_cart,
         SUM(items_purchased)    AS purchase
       FROM agg_product_performance
       ${where}`,
      params
    );

    const [[checkoutRow]] = await pool.execute(
      `SELECT SUM(items_checked_out) AS begin_checkout
       FROM ga4_item_interactions
       ${where}`,
      params
    );

    // Sipariş ve oturum verisi
    const trafficConditions = [];
    const trafficParams = [];
    if (date_from) { trafficConditions.push('date >= ?'); trafficParams.push(date_from); }
    if (date_to)   { trafficConditions.push('date <= ?'); trafficParams.push(date_to); }
    const trafficWhere = trafficConditions.length ? `WHERE ${trafficConditions.join(' AND ')}` : '';

    const [[trafficRow]] = await pool.execute(
      `SELECT SUM(sessions) AS sessions, SUM(conversions) AS conversions
       FROM kpi_daily_traffic ${trafficWhere}`,
      trafficParams
    );

    const item = itemRows[0] || {};
    const steps = [
      { step: 1, name: 'session_start',  value: Number(trafficRow?.sessions || 0) },
      { step: 2, name: 'view_item',      value: Number(item.view_item || 0) },
      { step: 3, name: 'add_to_cart',    value: Number(item.add_to_cart || 0) },
      { step: 4, name: 'begin_checkout', value: Number(checkoutRow?.begin_checkout || 0) },
      { step: 5, name: 'purchase',       value: Number(item.purchase || 0) },
      { step: 6, name: 'conversion',     value: Number(trafficRow?.conversions || 0) },
    ];

    // Her adım için bir öncekine göre drop-off oranı
    const funnel = steps.map((s, i) => ({
      ...s,
      rate: i === 0 ? 1 : steps[i - 1].value > 0 ? s.value / steps[i - 1].value : null,
    }));

    res.json(success({ funnel }, { steps: funnel.length }));
  } catch (err) {
    next(err);
  }
}

module.exports = { getTrend, getChannelPerformance, getPlatformPerformance, getCampaignPerformance, getFunnel };
