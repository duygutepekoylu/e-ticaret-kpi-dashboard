'use strict';

const { pool } = require('../config/database');
const traffic = require('./traffic');
const ads = require('./ads');
const sales = require('./sales');
const channel = require('./channel');
const campaign = require('./campaign');
const product = require('./product');
const cohort = require('./cohort');

// refresh_logs kaydını oluşturur (transaction dışı — hata olsa da kayıt kalır)
async function createRefreshLog(tableName, triggeredBy) {
  const [result] = await pool.execute(
    'INSERT INTO refresh_logs (triggered_by, table_name, status) VALUES (?, ?, ?)',
    [triggeredBy ?? null, tableName, 'running']
  );
  return result.insertId;
}

async function completeRefreshLog(id, rowsAffected, durationMs) {
  await pool.execute(
    'UPDATE refresh_logs SET status=?, rows_affected=?, duration_ms=?, completed_at=NOW() WHERE id=?',
    ['completed', rowsAffected, durationMs, id]
  );
}

async function failRefreshLog(id, errorMessage, durationMs) {
  await pool.execute(
    'UPDATE refresh_logs SET status=?, error_message=?, duration_ms=?, completed_at=NOW() WHERE id=?',
    ['failed', String(errorMessage).slice(0, 500), durationMs, id]
  );
}

// Tek bir KPI modülünü çalıştırır — transaction + refresh_log yönetimi
async function runKpiModule(tableName, computeFn, triggeredBy) {
  const refreshLogId = await createRefreshLog(tableName, triggeredBy);
  const startTime = Date.now();
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();
    const rowsAffected = await computeFn(conn, refreshLogId);
    await conn.commit();
    const durationMs = Date.now() - startTime;
    await completeRefreshLog(refreshLogId, rowsAffected, durationMs);
    return { table: tableName, rows: rowsAffected, durationMs };
  } catch (err) {
    await conn.rollback();
    await failRefreshLog(refreshLogId, err.message, Date.now() - startTime);
    throw err;
  } finally {
    conn.release();
  }
}

async function runTrafficKpi(triggeredBy = null) {
  return runKpiModule('kpi_daily_traffic', traffic.compute, triggeredBy);
}

async function runAdsKpi(triggeredBy = null) {
  return runKpiModule('kpi_daily_ads', ads.compute, triggeredBy);
}

async function runSalesKpi(triggeredBy = null) {
  return runKpiModule('kpi_daily_sales', sales.compute, triggeredBy);
}

async function runChannelKpi(triggeredBy = null) {
  return runKpiModule('agg_channel_performance', channel.compute, triggeredBy);
}

async function runCampaignKpi(triggeredBy = null) {
  return runKpiModule('agg_campaign_performance', campaign.compute, triggeredBy);
}

async function runProductKpi(triggeredBy = null) {
  return runKpiModule('agg_product_performance', product.compute, triggeredBy);
}

async function runCohortKpi(triggeredBy = null) {
  return runKpiModule('agg_cohort_retention', cohort.compute, triggeredBy);
}

// Tüm KPI hesaplamalarını sırayla çalıştırır (Faz 5 + Faz 6)
async function runAllKpi(triggeredBy = null) {
  const results = [];
  results.push(await runTrafficKpi(triggeredBy));
  results.push(await runAdsKpi(triggeredBy));
  results.push(await runSalesKpi(triggeredBy));
  results.push(await runChannelKpi(triggeredBy));
  results.push(await runCampaignKpi(triggeredBy));
  results.push(await runProductKpi(triggeredBy));
  results.push(await runCohortKpi(triggeredBy));
  return results;
}

module.exports = {
  runAllKpi,
  runTrafficKpi, runAdsKpi, runSalesKpi,
  runChannelKpi, runCampaignKpi, runProductKpi, runCohortKpi,
};
