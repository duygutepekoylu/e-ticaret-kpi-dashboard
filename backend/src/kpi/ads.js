'use strict';

const { roas, growthRate } = require('./formulas');

function toDateStr(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function prevDate(v) {
  const d = new Date(toDateStr(v) + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// meta_ads + google_ads → kpi_daily_ads
// KRİTİK: revenue orders tablosundan gelir — pixel_purchase_value ve
//         conversions_value kullanılmaz (reklam platformları şişirebilir)
async function compute(conn, refreshLogId) {
  const [metaRows] = await conn.execute(`
    SELECT
      date,
      campaign_name,
      SUM(impressions)                                         AS impressions,
      SUM(clicks)                                              AS clicks,
      SUM(spend)                                               AS spend,
      SUM(clicks)      / NULLIF(SUM(impressions), 0)          AS ctr,
      SUM(spend)       / NULLIF(SUM(clicks), 0)               AS cpc,
      SUM(spend)       / NULLIF(SUM(impressions), 0) * 1000   AS cpm,
      SUM(pixel_purchase)                                      AS conversions,
      SUM(impressions) / NULLIF(SUM(reach), 0)                AS frequency
    FROM meta_ads
    GROUP BY date, campaign_name
    ORDER BY date, campaign_name
  `);

  const [googleRows] = await conn.execute(`
    SELECT
      date,
      campaign_name,
      SUM(impressions)                                         AS impressions,
      SUM(clicks)                                              AS clicks,
      SUM(cost_tl)                                             AS spend,
      SUM(clicks)      / NULLIF(SUM(impressions), 0)          AS ctr,
      SUM(cost_tl)     / NULLIF(SUM(clicks), 0)               AS cpc,
      SUM(cost_tl)     / NULLIF(SUM(impressions), 0) * 1000   AS cpm,
      SUM(conversions)                                         AS conversions
    FROM google_ads
    GROUP BY date, campaign_name
    ORDER BY date, campaign_name
  `);

  // Gelir her zaman orders tablosundan — campaign_name + tarih bazlı
  const [revenueRows] = await conn.execute(`
    SELECT
      DATE(order_date)  AS date,
      campaign_name,
      SUM(net_revenue)  AS revenue
    FROM orders
    WHERE campaign_name IS NOT NULL
      AND order_status IN ('completed', 'shipped')
    GROUP BY DATE(order_date), campaign_name
  `);

  const revenueMap = {};
  for (const r of revenueRows) {
    revenueMap[`${toDateStr(r.date)}|${r.campaign_name}`] = Number(r.revenue) || 0;
  }

  // Her platform için satırları birleştir
  const allRows = [
    ...metaRows.map(r => ({
      date: toDateStr(r.date),
      platform: 'meta',
      campaign_name: r.campaign_name,
      impressions: Number(r.impressions) || 0,
      clicks: Number(r.clicks) || 0,
      spend: Number(r.spend) || 0,
      ctr: Number(r.ctr) || 0,
      cpc: Number(r.cpc) || 0,
      cpm: Number(r.cpm) || 0,
      conversions: Number(r.conversions) || 0,
      frequency: r.frequency != null ? Number(r.frequency) : null,
    })),
    ...googleRows.map(r => ({
      date: toDateStr(r.date),
      platform: 'google',
      campaign_name: r.campaign_name,
      impressions: Number(r.impressions) || 0,
      clicks: Number(r.clicks) || 0,
      spend: Number(r.spend) || 0,
      ctr: Number(r.ctr) || 0,
      cpc: Number(r.cpc) || 0,
      cpm: Number(r.cpm) || 0,
      conversions: Number(r.conversions) || 0,
      frequency: null, // Google'da frequency yok
    })),
  ];

  if (allRows.length === 0) return 0;

  // Spend ve ROAS büyüme oranlarını hesapla
  // Gruplar: platform + campaign_name bazında, tarih sıralı
  const groups = {};
  for (const r of allRows) {
    const key = `${r.platform}|${r.campaign_name}`;
    if (!groups[key]) groups[key] = {};
    const rev = revenueMap[`${r.date}|${r.campaign_name}`] ?? 0;
    groups[key][r.date] = { spend: r.spend, roas_val: roas(rev, r.spend) };
  }

  await conn.execute('DELETE FROM kpi_daily_ads');

  const values = allRows.map(r => {
    const key = `${r.platform}|${r.campaign_name}`;
    const prev = groups[key]?.[prevDate(r.date)];
    const revenue = revenueMap[`${r.date}|${r.campaign_name}`] ?? 0;
    const roasVal = roas(revenue, r.spend);
    const costPerConv = r.conversions > 0 ? r.spend / r.conversions : 0;

    return [
      r.date,
      r.platform,
      r.campaign_name,
      refreshLogId,
      r.impressions,
      r.clicks,
      r.spend,
      r.ctr,
      r.cpc,
      r.cpm,
      r.conversions,
      revenue,
      roasVal ?? 0,         // NOT NULL — spend=0 durumunda 0
      costPerConv,
      r.frequency,          // Meta: değer, Google: NULL
      prev ? growthRate(r.spend, prev.spend) : null,
      prev ? growthRate(roasVal, prev.roas_val) : null,
    ];
  });

  await conn.query(
    `INSERT INTO kpi_daily_ads
      (date, platform, campaign_name, refresh_log_id,
       impressions, clicks, spend, ctr, cpc, cpm,
       conversions, revenue, roas, cost_per_conversion,
       frequency, spend_growth_rate, roas_growth_rate)
     VALUES ?`,
    [values]
  );

  return allRows.length;
}

module.exports = { compute };
