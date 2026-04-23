'use strict';

const { roas, conversionRate } = require('./formulas');

// orders + ga4_traffic + meta_ads + google_ads → agg_channel_performance
//
// Gelir: orders.channel üzerinden (GA4 attribution — toplantı kararı)
// Trafik: ga4_traffic.session_default_channel_group üzerinden
// Harcama: meta_ads.spend + google_ads.cost_tl, kampanya adı üzerinden channel eşleme
// KRİTİK: Organic kanalda spend=0 → roas=null
async function compute(conn, refreshLogId) {
  // Gelir + sipariş metrikleri — orders.channel bazında
  const [revenueRows] = await conn.execute(`
    SELECT
      DATE(order_date)        AS date,
      channel                 AS channel_group,
      COUNT(order_id)         AS orders,
      SUM(order_revenue)      AS revenue,
      SUM(net_revenue)        AS net_revenue
    FROM orders
    WHERE order_status IN ('completed', 'shipped')
    GROUP BY DATE(order_date), channel
  `);

  // Trafik metrikleri — ga4_traffic.session_default_channel_group bazında
  // KRİTİK: weighted avg bounce_rate
  const [trafficRows] = await conn.execute(`
    SELECT
      date,
      session_default_channel_group                              AS channel_group,
      SUM(sessions)                                              AS sessions,
      SUM(total_users)                                           AS total_users,
      SUM(sessions * bounce_rate) / NULLIF(SUM(sessions), 0)    AS bounce_rate
    FROM ga4_traffic
    GROUP BY date, session_default_channel_group
  `);

  // Harcama: meta_ads kampanya → kampanyanın channel'ını orders üzerinden alıyoruz
  // Yaklaşım: meta_ads + google_ads → date + campaign_name bazlı spend toplamı
  // Sonra orders üzerinden campaign_name → channel eşlemesi
  const [metaSpendRows] = await conn.execute(`
    SELECT date, campaign_name, SUM(spend) AS spend
    FROM meta_ads
    GROUP BY date, campaign_name
  `);

  const [googleSpendRows] = await conn.execute(`
    SELECT date, campaign_name, SUM(cost_tl) AS spend
    FROM google_ads
    GROUP BY date, campaign_name
  `);

  // campaign_name → channel eşlemesi: orders tablosundan al
  const [campaignChannelRows] = await conn.execute(`
    SELECT DISTINCT campaign_name, channel
    FROM orders
    WHERE campaign_name IS NOT NULL
  `);

  const campaignChannelMap = {};
  for (const r of campaignChannelRows) {
    campaignChannelMap[r.campaign_name] = r.channel;
  }

  // Date+channel bazında harcama toplama
  function toDateStr(v) {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v).slice(0, 10);
  }

  const spendMap = {};
  function addSpend(date, campaignName, amount) {
    const channel = campaignChannelMap[campaignName];
    if (!channel) return;
    const key = `${toDateStr(date)}|${channel}`;
    spendMap[key] = (spendMap[key] || 0) + (Number(amount) || 0);
  }

  for (const r of metaSpendRows) addSpend(r.date, r.campaign_name, r.spend);
  for (const r of googleSpendRows) addSpend(r.date, r.campaign_name, r.spend);

  // Trafik map: date+channel → {sessions, total_users, bounce_rate}
  const trafficMap = {};
  for (const r of trafficRows) {
    trafficMap[`${toDateStr(r.date)}|${r.channel_group}`] = {
      sessions: Number(r.sessions) || 0,
      total_users: Number(r.total_users) || 0,
      bounce_rate: Number(r.bounce_rate) || 0,
    };
  }

  if (revenueRows.length === 0) return 0;

  await conn.execute('DELETE FROM agg_channel_performance');

  const values = revenueRows.map(r => {
    const dateStr = toDateStr(r.date);
    const key = `${dateStr}|${r.channel_group}`;
    const traffic = trafficMap[key] || { sessions: 0, total_users: 0, bounce_rate: 0 };
    const spend = spendMap[key] || 0;
    const netRevenue = Number(r.net_revenue) || 0;
    const orders = Number(r.orders) || 0;

    return [
      dateStr,
      r.channel_group,
      refreshLogId,
      traffic.sessions,
      traffic.total_users,
      orders,
      Number(r.revenue) || 0,
      netRevenue,
      spend,
      roas(netRevenue, spend) ?? null,           // Organic → spend=0 → NULL
      conversionRate(orders, traffic.sessions),
      orders > 0 ? netRevenue / orders : 0,       // avg_order_value
      traffic.total_users > 0 ? netRevenue / traffic.total_users : 0,  // revenue_per_user
      traffic.bounce_rate,
    ];
  });

  await conn.query(
    `INSERT INTO agg_channel_performance
      (date, channel_group, refresh_log_id,
       sessions, total_users, orders,
       revenue, net_revenue, spend, roas,
       conversion_rate, avg_order_value, revenue_per_user, bounce_rate)
     VALUES ?`,
    [values]
  );

  return values.length;
}

module.exports = { compute };
