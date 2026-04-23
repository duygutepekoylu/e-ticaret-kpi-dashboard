'use strict';

const { growthRate } = require('./formulas');

function toDateStr(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function prevDate(v) {
  const d = new Date(toDateStr(v) + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// orders + order_items + customers → kpi_daily_sales
// KRİTİK: new_customer_revenue + returning_customer_revenue = net_revenue olmalı
async function compute(conn, refreshLogId) {
  const [rows] = await conn.execute(`
    SELECT
      DATE(o.order_date)                                            AS date,
      COUNT(o.order_id)                                            AS total_orders,
      SUM(o.order_revenue)                                         AS total_revenue,
      SUM(o.net_revenue)                                           AS net_revenue,
      COALESCE(SUM(oi.total_qty), 0)                               AS total_items_sold,
      SUM(o.refund_amount)   / NULLIF(SUM(o.order_revenue), 0)    AS refund_rate,
      SUM(o.discount_amount) / NULLIF(SUM(o.order_revenue), 0)    AS discount_rate,
      SUM(CASE WHEN DATE(c.first_order_date) = DATE(o.order_date)
            THEN o.net_revenue ELSE 0 END)                         AS new_customer_revenue,
      -- "Geri dönen" = yeni müşteri OLMAYAN her şey (first_order_date < veya > veya NULL)
      -- Bu yaklaşım new + returning = net_revenue garantisi verir
      SUM(CASE WHEN DATE(c.first_order_date) != DATE(o.order_date) OR c.first_order_date IS NULL
            THEN o.net_revenue ELSE 0 END)                         AS returning_customer_revenue,
      COUNT(CASE WHEN c.total_orders > 1 THEN 1 END)
        / NULLIF(COUNT(o.customer_id), 0)                          AS repeat_purchase_rate
    FROM orders o
    LEFT JOIN (
      SELECT order_id, SUM(quantity) AS total_qty
      FROM order_items
      GROUP BY order_id
    ) oi ON o.order_id = oi.order_id
    LEFT JOIN customers c ON o.customer_id = c.customer_id
    WHERE o.order_status IN ('completed', 'shipped')
    GROUP BY DATE(o.order_date)
    ORDER BY date
  `);

  if (rows.length === 0) return 0;

  // Önceki güne ait net_revenue — boşluklu günler için güvenli yaklaşım
  const revenueByDate = {};
  for (const r of rows) {
    revenueByDate[toDateStr(r.date)] = Number(r.net_revenue) || 0;
  }

  await conn.execute('DELETE FROM kpi_daily_sales');

  const values = rows.map(r => {
    const netRevenue = Number(r.net_revenue) || 0;
    const totalOrders = Number(r.total_orders) || 0;
    const prev = revenueByDate[prevDate(r.date)];


    return [
      r.date,
      refreshLogId,
      totalOrders,
      r.total_revenue,
      netRevenue,
      r.total_items_sold,
      totalOrders > 0 ? netRevenue / totalOrders : 0,  // avg_order_value
      r.refund_rate ?? 0,
      r.discount_rate ?? 0,
      r.repeat_purchase_rate ?? 0,
      r.new_customer_revenue,
      r.returning_customer_revenue,
      prev !== undefined ? growthRate(netRevenue, prev) : null,  // revenue_growth_rate
    ];
  });

  await conn.query(
    `INSERT INTO kpi_daily_sales
      (date, refresh_log_id,
       total_orders, total_revenue, net_revenue, total_items_sold,
       avg_order_value, refund_rate, discount_rate, repeat_purchase_rate,
       new_customer_revenue, returning_customer_revenue, revenue_growth_rate)
     VALUES ?`,
    [values]
  );

  return rows.length;
}

module.exports = { compute };
