require('dotenv').config();
const { pool } = require('./src/config/database');

async function testQuery() {
  try {
    console.log("Testing getTrend Query...");
    const [rows1] = await pool.execute(`
       SELECT
         t.date,
         t.sessions,
         t.users,
         t.conversions,
         t.bounce_rate,
         s.net_revenue,
         s.total_orders,
         a.spend,
         a.revenue / NULLIF(a.spend, 0) AS roas
       FROM kpi_daily_traffic t
       LEFT JOIN kpi_daily_sales s ON t.date = s.date
       LEFT JOIN (
         SELECT date, SUM(spend) AS spend, SUM(revenue) AS revenue
         FROM kpi_daily_ads GROUP BY date
       ) a ON t.date = a.date
       ORDER BY t.date ASC LIMIT 5
    `);
    console.log("Trend query OK", rows1.length);
  } catch (err) {
    console.error("Trend query error:", err.message);
  }

  try {
    console.log("Testing getFunnel Query...");
    const [rows2] = await pool.execute(`
       SELECT
         SUM(items_viewed)       AS view_item,
         SUM(items_added_to_cart) AS add_to_cart,
         SUM(items_purchased)    AS purchase
       FROM agg_product_performance
    `);
    console.log("Funnel query OK", rows2.length);
  } catch(err) {
    console.error("Funnel query error:", err.message);
  }

  try {
    console.log("Testing logs/audit Query...");
    const [rows3] = await pool.execute(`
       SELECT al.*, u.email AS user_email FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ORDER BY al.created_at DESC LIMIT 5
    `);
    console.log("Logs query OK", rows3.length);
  } catch(err) {
    console.error("Logs query error:", err.message);
  }

  process.exit();
}

testQuery();
