'use strict';

const { pool } = require('../config/database');
const { growthRate } = require('./formulas');

// mysql2: DATE sütunları Date objesi veya string olarak gelebilir
function toDateStr(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function prevDate(v) {
  const d = new Date(toDateStr(v) + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ga4_traffic → kpi_daily_traffic
// KRİTİK: bounce_rate, pages_per_session, avg_session_duration, engagement_rate
//         weighted average — basit AVG YANLIŞ
async function compute(conn, refreshLogId) {
  const [rows] = await conn.execute(`
    SELECT
      date,
      session_default_channel_group                              AS channel_group,
      SUM(sessions)                                              AS sessions,
      SUM(total_users)                                           AS total_users,
      SUM(new_users)                                             AS new_users,
      SUM(sessions * bounce_rate)  / NULLIF(SUM(sessions), 0)   AS bounce_rate,
      SUM(sessions * avg_session_duration) / NULLIF(SUM(sessions), 0) AS avg_session_duration,
      SUM(sessions * pages_per_session)    / NULLIF(SUM(sessions), 0) AS pages_per_session,
      SUM(sessions * engagement_rate)      / NULLIF(SUM(sessions), 0) AS engagement_rate,
      SUM(engaged_sessions)                                      AS engaged_sessions,
      SUM(conversions)                                           AS conversions,
      SUM(purchase_revenue)                                      AS purchase_revenue,
      SUM(transactions)                                          AS transactions
    FROM ga4_traffic
    GROUP BY date, session_default_channel_group
    ORDER BY date, channel_group
  `);

  if (rows.length === 0) return 0;

  // Önceki güne ait session sayısı — boşluklu günler için güvenli yaklaşım
  const sessionMap = {};
  for (const r of rows) {
    if (!sessionMap[r.channel_group]) sessionMap[r.channel_group] = {};
    sessionMap[r.channel_group][toDateStr(r.date)] = r.sessions;
  }

  const values = rows.map(r => {
    const prev = sessionMap[r.channel_group]?.[prevDate(r.date)];
    const totalUsers = Number(r.total_users) || 0;
    const purchaseRevenue = Number(r.purchase_revenue) || 0;

    return [
      r.date,
      r.channel_group,
      refreshLogId,
      r.sessions,
      totalUsers,
      r.new_users,
      r.bounce_rate ?? 0,
      r.avg_session_duration ?? 0,
      r.pages_per_session ?? 0,
      r.engaged_sessions,
      r.engagement_rate ?? 0,
      r.conversions,
      purchaseRevenue,
      r.transactions,
      totalUsers > 0 ? purchaseRevenue / totalUsers : 0,  // revenue_per_user
      growthRate(r.sessions, prev ?? null),               // traffic_growth_rate (nullable)
    ];
  });

  await conn.execute('DELETE FROM kpi_daily_traffic');

  await conn.query(
    `INSERT INTO kpi_daily_traffic
      (date, channel_group, refresh_log_id,
       sessions, total_users, new_users,
       bounce_rate, avg_session_duration, pages_per_session,
       engaged_sessions, engagement_rate,
       conversions, purchase_revenue, transactions,
       revenue_per_user, traffic_growth_rate)
     VALUES ?`,
    [values]
  );

  return rows.length;
}

module.exports = { compute };
