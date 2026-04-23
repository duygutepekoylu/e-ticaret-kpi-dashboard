'use strict';
process.chdir(__dirname);

const { weightedAvg, roas, growthRate } = require('./src/kpi/formulas');
const { runAllKpi } = require('./src/kpi/runner');
const { pool } = require('./src/config/database');

function ok(label, pass, detail = '') {
  const icon = pass ? '✅' : '❌';
  console.log(`${icon} ${label}${detail ? '  →  ' + detail : ''}`);
  if (!pass) process.exitCode = 1;
}

function approx(a, b, eps = 0.0001) {
  return Math.abs(a - b) < eps;
}

// ── Birim testleri (DB gerektirmez) ──────────────────────────────────────────
console.log('\n=== FORMULAS.JS BİRİM TESTLERİ ===');

const wRows = [
  { bounce_rate: 0.30, sessions: 1000 },
  { bounce_rate: 0.90, sessions: 10 },
];
const wResult = weightedAvg(wRows, 'bounce_rate', 'sessions');
const wExpected = (0.30 * 1000 + 0.90 * 10) / 1010; // ~0.3059
ok('weightedAvg: 1000 session %30 + 10 session %90 → ~0.306', approx(wResult, wExpected), wResult.toFixed(6));

ok('roas: spend=0 → null', roas(500, 0) === null, String(roas(500, 0)));
ok('roas: roas(1000, 100) → 10.0', approx(roas(1000, 100), 10.0), roas(1000, 100));

ok('growthRate: growthRate(120, 100) → 0.2', approx(growthRate(120, 100), 0.2), growthRate(120, 100));
ok('growthRate: previous=0 → null', growthRate(100, 0) === null, String(growthRate(100, 0)));
ok('growthRate: previous=null → null', growthRate(100, null) === null, String(growthRate(100, null)));

// ── DB testleri ───────────────────────────────────────────────────────────────
(async () => {
  console.log('\n=== KPI HESAPLAMA (runAllKpi) ===');

  // TCP bağlantısı — socket EPIPE sorunu giderildi (DB_SOCKET kaldırıldı, 127.0.0.1 TCP)
  await pool.execute('SELECT 1');

  const results = await runAllKpi(null);
  console.log('runAllKpi tamamlandı:');
  for (const r of results) {
    ok(`  ${r.table}: ${r.rows} satır, ${r.durationMs}ms`, r.rows > 0, `rows=${r.rows}`);
  }

  // ── kpi_daily_traffic: satır sayısı + weighted avg doğrulaması ──
  console.log('\n=== KPI_DAILY_TRAFFIC TESTLERİ ===');

  const [[{ trafficCnt }]] = await pool.execute(
    'SELECT COUNT(*) AS trafficCnt FROM kpi_daily_traffic'
  );
  ok('kpi_daily_traffic: veri var mı', Number(trafficCnt) > 0, `${trafficCnt} satır`);

  // Bir tarih + kanal seç, weighted avg'ı manuel hesapla, karşılaştır
  const [[sample]] = await pool.execute(
    'SELECT date, channel_group FROM kpi_daily_traffic ORDER BY date LIMIT 1'
  );
  if (sample) {
    const [[stored]] = await pool.execute(
      'SELECT bounce_rate FROM kpi_daily_traffic WHERE date=? AND channel_group=?',
      [sample.date, sample.channel_group]
    );
    const [gaRows] = await pool.execute(
      `SELECT bounce_rate, sessions FROM ga4_traffic
       WHERE date=? AND session_default_channel_group=?`,
      [sample.date, sample.channel_group]
    );
    const manualWeighted = weightedAvg(gaRows, 'bounce_rate', 'sessions');
    ok(
      `bounce_rate weighted avg doğru mu (${sample.date} / ${sample.channel_group})`,
      approx(Number(stored.bounce_rate), manualWeighted, 0.001),
      `stored=${Number(stored.bounce_rate).toFixed(4)}, manual=${manualWeighted.toFixed(4)}`
    );
  }

  // traffic_growth_rate: ilk gün NULL olmalı
  const [[firstDay]] = await pool.execute(
    `SELECT date, channel_group, traffic_growth_rate FROM kpi_daily_traffic
     ORDER BY date LIMIT 1`
  );
  ok(
    'traffic_growth_rate: veri var olan ilk gün NULL',
    firstDay.traffic_growth_rate === null,
    `${firstDay.date} / ${firstDay.channel_group} → ${firstDay.traffic_growth_rate}`
  );

  // ── kpi_daily_ads testleri ──
  console.log('\n=== KPI_DAILY_ADS TESTLERİ ===');

  const [[{ adsCnt }]] = await pool.execute('SELECT COUNT(*) AS adsCnt FROM kpi_daily_ads');
  ok('kpi_daily_ads: veri var mı', Number(adsCnt) > 0, `${adsCnt} satır`);

  // Google frequency NULL kontrolü
  const [[{ googleWithFreq }]] = await pool.execute(
    "SELECT COUNT(*) AS googleWithFreq FROM kpi_daily_ads WHERE platform='google' AND frequency IS NOT NULL"
  );
  ok('Google frequency → her zaman NULL', Number(googleWithFreq) === 0, `null olmayan satır: ${googleWithFreq}`);

  // Meta frequency NULL değil kontrolü
  const [[{ metaWithFreq }]] = await pool.execute(
    "SELECT COUNT(*) AS metaWithFreq FROM kpi_daily_ads WHERE platform='meta' AND frequency IS NOT NULL"
  );
  ok('Meta frequency: değer var', Number(metaWithFreq) > 0, `değer olan satır: ${metaWithFreq}`);

  // ROAS doğrulaması: pixel_purchase_value KULLANILMIYOR — gelir orders tablosundan
  // Bir kampanya seç, orders geliriyle karşılaştır
  const [[adsSample]] = await pool.execute(
    `SELECT date, campaign_name, platform, revenue, roas, spend
     FROM kpi_daily_ads WHERE platform='meta' AND spend > 0 LIMIT 1`
  );
  if (adsSample) {
    const [[{ ordersRevenue }]] = await pool.execute(
      `SELECT COALESCE(SUM(net_revenue), 0) AS ordersRevenue
       FROM orders
       WHERE DATE(order_date)=? AND campaign_name=? AND order_status IN ('completed','shipped')`,
      [adsSample.date, adsSample.campaign_name]
    );
    ok(
      `ROAS geliri orders tablosundan geliyor (${adsSample.campaign_name})`,
      approx(Number(adsSample.revenue), Number(ordersRevenue), 0.01),
      `ads.revenue=${adsSample.revenue}, orders=${ordersRevenue}`
    );

    // pixel_purchase_value ile EŞLEŞMEMELI (reklam platformu şişirme riski)
    const [[{ pixelVal }]] = await pool.execute(
      `SELECT SUM(pixel_purchase_value) AS pixelVal FROM meta_ads
       WHERE date=? AND campaign_name=?`,
      [adsSample.date, adsSample.campaign_name]
    );
    const roasFromOrders = roas(Number(ordersRevenue), Number(adsSample.spend));
    const roasFromPixel  = roas(Number(pixelVal),     Number(adsSample.spend));
    ok(
      'ROAS kaynağı: pixel_purchase_value kullanılmıyor',
      roasFromPixel === null || !approx(roasFromOrders ?? 0, roasFromPixel ?? 0, 0.01),
      `orders ROAS=${roasFromOrders?.toFixed(4)}, pixel ROAS=${roasFromPixel?.toFixed(4)}`
    );
  }

  // spend_growth_rate ilk gün NULL olmalı
  const [[firstAdDay]] = await pool.execute(
    `SELECT date, platform, campaign_name, spend_growth_rate FROM kpi_daily_ads
     ORDER BY date LIMIT 1`
  );
  ok(
    'spend_growth_rate: veri var olan ilk gün NULL',
    firstAdDay.spend_growth_rate === null,
    `${firstAdDay.date} / ${firstAdDay.platform} / ${firstAdDay.campaign_name}`
  );

  // ── kpi_daily_sales testleri ──
  console.log('\n=== KPI_DAILY_SALES TESTLERİ ===');

  const [[{ salesCnt }]] = await pool.execute('SELECT COUNT(*) AS salesCnt FROM kpi_daily_sales');
  ok('kpi_daily_sales: veri var mı', Number(salesCnt) > 0, `${salesCnt} satır`);

  // new + returning = net_revenue
  const [[{ mismatch }]] = await pool.execute(
    `SELECT COUNT(*) AS mismatch FROM kpi_daily_sales
     WHERE ABS(new_customer_revenue + returning_customer_revenue - net_revenue) > 0.01`
  );
  ok(
    'new_customer_revenue + returning_customer_revenue = net_revenue',
    Number(mismatch) === 0,
    `uyumsuz gün sayısı: ${mismatch}`
  );

  // avg_order_value = net_revenue / total_orders
  const [[{ aoMismatch }]] = await pool.execute(
    `SELECT COUNT(*) AS aoMismatch FROM kpi_daily_sales
     WHERE total_orders > 0
       AND ABS(avg_order_value - net_revenue / total_orders) > 0.01`
  );
  ok('avg_order_value = net_revenue / total_orders', Number(aoMismatch) === 0, `uyumsuz: ${aoMismatch}`);

  // revenue_growth_rate ilk gün NULL olmalı
  const [[firstSaleDay]] = await pool.execute(
    'SELECT date, revenue_growth_rate FROM kpi_daily_sales ORDER BY date LIMIT 1'
  );
  ok(
    'revenue_growth_rate: veri var olan ilk gün NULL',
    firstSaleDay.revenue_growth_rate === null,
    `${firstSaleDay.date} → ${firstSaleDay.revenue_growth_rate}`
  );

  // ── refresh_logs kayıtları ──
  console.log('\n=== REFRESH_LOGS ===');
  const [logRows] = await pool.execute(
    `SELECT table_name, status, rows_affected, duration_ms
     FROM refresh_logs ORDER BY id DESC LIMIT 3`
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
