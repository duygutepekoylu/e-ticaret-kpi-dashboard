'use strict';
process.chdir(__dirname);

const { runChannelKpi, runCampaignKpi, runProductKpi, runCohortKpi } = require('./src/kpi/runner');
const { pool } = require('./src/config/database');

function ok(label, pass, detail = '') {
  const icon = pass ? '✅' : '❌';
  console.log(`${icon} ${label}${detail ? '  →  ' + detail : ''}`);
  if (!pass) process.exitCode = 1;
}

function approx(a, b, eps = 0.01) {
  return Math.abs(a - b) < eps;
}

(async () => {
  await pool.execute('SELECT 1');

  // ── Hesaplama ───────────────────────────────────────────────────────────────
  console.log('\n=== KPI HESAPLAMA (Faz 6) ===');
  const results = [];
  results.push(await runChannelKpi());
  results.push(await runCampaignKpi());
  results.push(await runProductKpi());
  results.push(await runCohortKpi());
  for (const r of results) {
    ok(`  ${r.table}: ${r.rows} satır, ${r.durationMs}ms`, r.rows > 0, `rows=${r.rows}`);
  }

  // ── agg_channel_performance ─────────────────────────────────────────────────
  console.log('\n=== AGG_CHANNEL_PERFORMANCE TESTLERİ ===');

  const [[{ chCnt }]] = await pool.execute('SELECT COUNT(*) AS chCnt FROM agg_channel_performance');
  ok('agg_channel_performance: veri var mı', Number(chCnt) > 0, `${chCnt} satır`);

  // Paid Social kanalının geliri orders tablosundan mı?
  // net_revenue kolonunu karşılaştır — revenue=gross, net_revenue=net (indirim/iade sonrası)
  const [[paidSocial]] = await pool.execute(
    `SELECT SUM(net_revenue) AS ch_rev FROM agg_channel_performance WHERE channel_group='Paid Social'`
  );
  const [[paidSocialOrders]] = await pool.execute(
    `SELECT SUM(net_revenue) AS ord_rev FROM orders
     WHERE channel='Paid Social' AND order_status IN ('completed','shipped')`
  );
  ok(
    'Paid Social net_revenue orders tablosundan',
    approx(Number(paidSocial?.ch_rev) || 0, Number(paidSocialOrders?.ord_rev) || 0, 1),
    `channel=${paidSocial?.ch_rev}, orders=${paidSocialOrders?.ord_rev}`
  );

  // Organic kanalda ROAS → NULL
  const [[organicRoas]] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM agg_channel_performance
     WHERE channel_group='Organic Search' AND roas IS NOT NULL`
  );
  ok(
    'Organic Search kanalında ROAS → NULL (spend=0)',
    Number(organicRoas.cnt) === 0,
    `NULL olmayan satır: ${organicRoas.cnt}`
  );

  // ── agg_campaign_performance ────────────────────────────────────────────────
  console.log('\n=== AGG_CAMPAIGN_PERFORMANCE TESTLERİ ===');

  const [[{ campCnt }]] = await pool.execute('SELECT COUNT(*) AS campCnt FROM agg_campaign_performance');
  ok('agg_campaign_performance: veri var mı', Number(campCnt) > 0, `${campCnt} satır`);

  // Bir kampanyanın spend'i meta + google toplamına eşit mi?
  const [[sampleCamp]] = await pool.execute(
    `SELECT campaign_name, SUM(spend) AS total_spend FROM agg_campaign_performance
     GROUP BY campaign_name ORDER BY total_spend DESC LIMIT 1`
  );
  if (sampleCamp) {
    const [[metaSpend]] = await pool.execute(
      'SELECT COALESCE(SUM(spend),0) AS s FROM meta_ads WHERE campaign_name=?',
      [sampleCamp.campaign_name]
    );
    const [[googleSpend]] = await pool.execute(
      'SELECT COALESCE(SUM(cost_tl),0) AS s FROM google_ads WHERE campaign_name=?',
      [sampleCamp.campaign_name]
    );
    const expectedSpend = Number(metaSpend.s) + Number(googleSpend.s);
    ok(
      `Kampanya spend = meta + google toplamı (${sampleCamp.campaign_name.slice(0, 30)})`,
      approx(Number(sampleCamp.total_spend), expectedSpend, 1),
      `agg=${sampleCamp.total_spend}, meta+google=${expectedSpend.toFixed(2)}`
    );

    // ROAS = orders.net_revenue / spend
    const [[{ campRevenue }]] = await pool.execute(
      `SELECT COALESCE(SUM(revenue),0) AS campRevenue FROM agg_campaign_performance
       WHERE campaign_name=?`,
      [sampleCamp.campaign_name]
    );
    const [[{ ordRevenue }]] = await pool.execute(
      `SELECT COALESCE(SUM(net_revenue),0) AS ordRevenue FROM orders
       WHERE campaign_name=? AND order_status IN ('completed','shipped')`,
      [sampleCamp.campaign_name]
    );
    ok(
      `Kampanya ROAS geliri orders tablosundan (${sampleCamp.campaign_name.slice(0, 30)})`,
      approx(Number(campRevenue), Number(ordRevenue), 1),
      `agg=${campRevenue}, orders=${ordRevenue}`
    );
  }

  // Meta + Google için ayrı platform satırları var mı?
  const [[{ metaCnt }]] = await pool.execute(
    "SELECT COUNT(*) AS metaCnt FROM agg_campaign_performance WHERE platform='meta'"
  );
  const [[{ googleCnt }]] = await pool.execute(
    "SELECT COUNT(*) AS googleCnt FROM agg_campaign_performance WHERE platform='google'"
  );
  ok('Meta platform satırları var', Number(metaCnt) > 0, `${metaCnt} satır`);
  ok('Google platform satırları var', Number(googleCnt) > 0, `${googleCnt} satır`);

  // ── agg_product_performance ─────────────────────────────────────────────────
  console.log('\n=== AGG_PRODUCT_PERFORMANCE TESTLERİ ===');

  const [[{ prodCnt }]] = await pool.execute('SELECT COUNT(*) AS prodCnt FROM agg_product_performance');
  ok('agg_product_performance: veri var mı', Number(prodCnt) > 0, `${prodCnt} satır`);

  // ga4_traffic ile JOIN yapılmadığını doğrula (dolaylı: satır sayısı ga4_item_interactions'dan geliyor)
  const [[{ ga4ItemCnt }]] = await pool.execute(
    'SELECT COUNT(DISTINCT date, item_id) AS ga4ItemCnt FROM ga4_item_interactions'
  );
  ok(
    'Satır sayısı ga4_item_interactions bazlı (ga4_traffic ile JOIN YOK)',
    Number(prodCnt) <= Number(ga4ItemCnt),
    `product=${prodCnt}, ga4_items distinct date+item=${ga4ItemCnt}`
  );

  // purchase_rate = items_purchased / items_viewed
  const [[{ rateMismatch }]] = await pool.execute(
    `SELECT COUNT(*) AS rateMismatch FROM agg_product_performance
     WHERE items_viewed > 0
       AND ABS(purchase_rate - items_purchased / items_viewed) > 0.001`
  );
  ok('purchase_rate = items_purchased / items_viewed', Number(rateMismatch) === 0, `uyumsuz: ${rateMismatch}`);

  // ── agg_cohort_retention ────────────────────────────────────────────────────
  console.log('\n=== AGG_COHORT_RETENTION TESTLERİ ===');

  const [[{ cohortCnt }]] = await pool.execute('SELECT COUNT(*) AS cohortCnt FROM agg_cohort_retention');
  ok('agg_cohort_retention: veri var mı', Number(cohortCnt) > 0, `${cohortCnt} satır`);

  // offset=0'da retention_rate = 1.0
  const [[{ offset0Mismatch }]] = await pool.execute(
    `SELECT COUNT(*) AS offset0Mismatch FROM agg_cohort_retention
     WHERE offset_month = 0 AND ABS(retention_rate - 1.0) > 0.001`
  );
  ok('offset=0: retention_rate = 1.0', Number(offset0Mismatch) === 0, `uyumsuz: ${offset0Mismatch}`);

  // cohort_month formatı YYYY-MM
  const [[{ formatCheck }]] = await pool.execute(
    `SELECT COUNT(*) AS formatCheck FROM agg_cohort_retention
     WHERE cohort_month NOT REGEXP '^[0-9]{4}-[0-9]{2}$'`
  );
  ok('cohort_month formatı YYYY-MM', Number(formatCheck) === 0, `format hatası: ${formatCheck}`);

  // Ay bazlı çalışıyor — gün bazlı değil (cohort_month değerinde gün yok)
  const [[sample]] = await pool.execute(
    'SELECT cohort_month FROM agg_cohort_retention LIMIT 1'
  );
  ok(
    'cohort_month gün içermiyor (ay bazlı)',
    sample && sample.cohort_month.length === 7,
    `örnek: ${sample?.cohort_month}`
  );

  // ── refresh_logs ────────────────────────────────────────────────────────────
  console.log('\n=== REFRESH_LOGS ===');
  const [logRows] = await pool.execute(
    `SELECT table_name, status, rows_affected, duration_ms
     FROM refresh_logs WHERE table_name IN
       ('agg_channel_performance','agg_campaign_performance',
        'agg_product_performance','agg_cohort_retention')
     ORDER BY id DESC LIMIT 4`
  );
  for (const l of logRows) {
    ok(`${l.table_name}: status=${l.status}`, l.status === 'completed', `rows=${l.rows_affected}, ${l.duration_ms}ms`);
  }

  await pool.end();
  console.log('\n' + (process.exitCode ? '❌ Bazı testler başarısız.' : '✅ Tüm testler geçti.'));
  process.exit(process.exitCode ?? 0);

})().catch(e => {
  console.error('\n❌ TEST HATASI:', e.message);
  console.error(e.stack);
  process.exit(1);
});
