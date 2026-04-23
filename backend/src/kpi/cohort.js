'use strict';

const { cohortRetentionRate } = require('./formulas');

// customers + orders → agg_cohort_retention
//
// KRİTİK: AY BAZLI çalışır — gün bazlı değil.
//         cohort_month = DATE_FORMAT(customers.first_order_date, '%Y-%m') → 'YYYY-MM'
//         offset_month = 0 → ilk ay, retention_rate = 1.0 (tanım gereği)
async function compute(conn, refreshLogId) {
  // Her cohort için toplam müşteri sayısı
  // Tanım: cohort ayında en az bir completed/shipped siparişi olan müşteriler
  // Bu filtre activity sorgusundaki filtreyle tutarlı — offset=0'da retention=1.0 garantisi
  const [cohortTotals] = await conn.execute(`
    SELECT
      DATE_FORMAT(c.first_order_date, '%Y-%m')  AS cohort_month,
      COUNT(DISTINCT o.customer_id)              AS total_customers
    FROM orders o
    JOIN customers c ON o.customer_id = c.customer_id
    WHERE c.first_order_date IS NOT NULL
      AND o.order_status IN ('completed', 'shipped')
      AND DATE_FORMAT(o.order_date, '%Y-%m') = DATE_FORMAT(c.first_order_date, '%Y-%m')
    GROUP BY DATE_FORMAT(c.first_order_date, '%Y-%m')
    ORDER BY cohort_month
  `);

  if (cohortTotals.length === 0) return 0;

  // Her cohort + offset kombinasyonu için aktif müşteri ve gelir
  // offset_month = ay farkı (period_diff)
  const [activityRows] = await conn.execute(`
    SELECT
      DATE_FORMAT(c.first_order_date, '%Y-%m')  AS cohort_month,
      PERIOD_DIFF(
        DATE_FORMAT(o.order_date, '%Y%m'),
        DATE_FORMAT(c.first_order_date, '%Y%m')
      )                                          AS offset_month,
      COUNT(DISTINCT o.customer_id)              AS active_customers,
      SUM(o.net_revenue)                         AS revenue,
      COUNT(DISTINCT o.order_id)                 AS order_count
    FROM orders o
    JOIN customers c ON o.customer_id = c.customer_id
    WHERE c.first_order_date IS NOT NULL
      AND o.order_status IN ('completed', 'shipped')
    GROUP BY
      DATE_FORMAT(c.first_order_date, '%Y-%m'),
      PERIOD_DIFF(
        DATE_FORMAT(o.order_date, '%Y%m'),
        DATE_FORMAT(c.first_order_date, '%Y%m')
      )
    HAVING offset_month >= 0
    ORDER BY cohort_month, offset_month
  `);

  // Totals map: cohort_month → total_customers
  const totalsMap = {};
  for (const r of cohortTotals) {
    totalsMap[r.cohort_month] = Number(r.total_customers) || 0;
  }

  if (activityRows.length === 0) return 0;

  await conn.execute('DELETE FROM agg_cohort_retention');

  const values = activityRows.map(r => {
    const total = totalsMap[r.cohort_month] || 0;
    const active = Number(r.active_customers) || 0;
    const revenue = Number(r.revenue) || 0;
    const orderCount = Number(r.order_count) || 0;

    return [
      r.cohort_month,
      Number(r.offset_month),
      refreshLogId,
      total,
      active,
      cohortRetentionRate(active, total),
      revenue,
      orderCount > 0 ? revenue / orderCount : 0,  // avg_order_value
    ];
  });

  await conn.query(
    `INSERT INTO agg_cohort_retention
      (cohort_month, offset_month, refresh_log_id,
       total_customers, active_customers, retention_rate,
       revenue, avg_order_value)
     VALUES ?`,
    [values]
  );

  return values.length;
}

module.exports = { compute };
