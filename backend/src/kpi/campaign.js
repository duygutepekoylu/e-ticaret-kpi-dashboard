'use strict';

const { roas } = require('./formulas');

function toDateStr(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

// campaigns + meta_ads + google_ads + orders → agg_campaign_performance
//
// KRİTİK: revenue orders tablosundan — campaign_name + tarih join
//         Her platform (meta/google) için ayrı satır
async function compute(conn, refreshLogId) {
  // Meta harcama + metrikler — campaign_name + tarih bazında
  const [metaRows] = await conn.execute(`
    SELECT
      date,
      campaign_name,
      SUM(impressions)                                        AS impressions,
      SUM(clicks)                                             AS clicks,
      SUM(spend)                                              AS spend,
      SUM(clicks)    / NULLIF(SUM(impressions), 0)           AS ctr,
      SUM(spend)     / NULLIF(SUM(clicks), 0)                AS cpc
    FROM meta_ads
    GROUP BY date, campaign_name
    ORDER BY date, campaign_name
  `);

  // Google harcama + metrikler — campaign_name + tarih bazında
  const [googleRows] = await conn.execute(`
    SELECT
      date,
      campaign_name,
      SUM(impressions)                                        AS impressions,
      SUM(clicks)                                             AS clicks,
      SUM(cost_tl)                                            AS spend,
      SUM(clicks)    / NULLIF(SUM(impressions), 0)           AS ctr,
      SUM(cost_tl)   / NULLIF(SUM(clicks), 0)                AS cpc
    FROM google_ads
    GROUP BY date, campaign_name
    ORDER BY date, campaign_name
  `);

  // Gelir ve dönüşüm — orders tablosundan, campaign_name + tarih bazında
  const [revenueRows] = await conn.execute(`
    SELECT
      DATE(order_date)    AS date,
      campaign_name,
      COUNT(order_id)     AS conversions,
      SUM(net_revenue)    AS revenue
    FROM orders
    WHERE campaign_name IS NOT NULL
      AND order_status IN ('completed', 'shipped')
    GROUP BY DATE(order_date), campaign_name
  `);

  const revenueMap = {};
  for (const r of revenueRows) {
    revenueMap[`${toDateStr(r.date)}|${r.campaign_name}`] = {
      revenue: Number(r.revenue) || 0,
      conversions: Number(r.conversions) || 0,
    };
  }

  const allRows = [
    ...metaRows.map(r => ({ ...r, date: toDateStr(r.date), platform: 'meta' })),
    ...googleRows.map(r => ({ ...r, date: toDateStr(r.date), platform: 'google' })),
  ];

  if (allRows.length === 0) return 0;

  await conn.execute('DELETE FROM agg_campaign_performance');

  const values = allRows.map(r => {
    const key = `${r.date}|${r.campaign_name}`;
    const rev = revenueMap[key] || { revenue: 0, conversions: 0 };
    const spend = Number(r.spend) || 0;
    const clicks = Number(r.clicks) || 0;
    const impressions = Number(r.impressions) || 0;
    const conversions = rev.conversions;
    const revenue = rev.revenue;

    return [
      r.date,
      r.campaign_name,
      r.platform,
      refreshLogId,
      impressions,
      clicks,
      spend,
      revenue,
      roas(revenue, spend) ?? 0,
      conversions,
      clicks > 0 ? impressions > 0 ? clicks / impressions : 0 : Number(r.ctr) || 0,
      spend > 0 && clicks > 0 ? spend / clicks : Number(r.cpc) || 0,
      conversions > 0 ? revenue / conversions : 0,       // avg_order_value
      conversions > 0 ? spend / conversions : 0,         // cost_per_conversion
    ];
  });

  await conn.query(
    `INSERT INTO agg_campaign_performance
      (date, campaign_name, platform, refresh_log_id,
       impressions, clicks, spend,
       revenue, roas, conversions,
       ctr, cpc, avg_order_value, cost_per_conversion)
     VALUES ?`,
    [values]
  );

  return values.length;
}

module.exports = { compute };
