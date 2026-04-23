'use strict';

const { pool } = require('../config/database');
const runner = require('../kpi/runner');
const { success } = require('../utils/formatters');
const { auditLog } = require('../utils/auditLogger');

/**
 * POST /api/v1/kpi/run
 * Tüm KPI hesaplamalarını yeniden çalıştırır (admin + marketing)
 */
async function runKpi(req, res, next) {
  try {
    const triggeredBy = req.user.id;
    const results = await runner.runAllKpi(triggeredBy);
    await auditLog({ userId: triggeredBy, action: 'KPI_RUN', tableName: 'kpi_*', recordId: String(results.length) });
    res.json(success({ results }, { tables: results.length }));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/kpi/summary
 * Tüm KPI tablolarından özet metrikler döner
 * Query: date_from, date_to
 */
async function getSummary(req, res, next) {
  try {
    const { date_from, date_to } = req.query;
    const conditions = [];
    const params = [];
    if (date_from) { conditions.push('date >= ?'); params.push(date_from); }
    if (date_to)   { conditions.push('date <= ?'); params.push(date_to); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [[traffic]] = await pool.execute(
      `SELECT SUM(sessions) AS total_sessions, SUM(total_users) AS total_users,
              SUM(conversions) AS total_conversions,
              SUM(bounce_rate * sessions) / NULLIF(SUM(sessions),0) AS avg_bounce_rate,
              SUM(avg_session_duration * sessions) / NULLIF(SUM(sessions),0) AS avg_session_duration
       FROM kpi_daily_traffic ${where}`,
      params
    );

    const [[ads]] = await pool.execute(
      `SELECT SUM(spend) AS total_spend, SUM(impressions) AS total_impressions,
              SUM(clicks) AS total_clicks,
              SUM(revenue) / NULLIF(SUM(spend),0) AS overall_roas
       FROM kpi_daily_ads ${where}`,
      params
    );

    const [[sales]] = await pool.execute(
      `SELECT SUM(total_orders) AS total_orders, SUM(net_revenue) AS total_revenue,
              SUM(new_customer_revenue) AS new_customer_revenue,
              SUM(returning_customer_revenue) AS returning_customer_revenue,
              AVG(refund_rate) AS avg_refund_rate
       FROM kpi_daily_sales ${where}`,
      params
    );

    res.json(success({ traffic, ads, sales }));
  } catch (err) {
    next(err);
  }
}

module.exports = { runKpi, getSummary };
