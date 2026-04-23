require('dotenv').config();
const { pool } = require('./src/config/database');

async function check() {
  try {
    const params = [];
    const where = ""; // Test without WHERE first
    
    // Testing getFunnel exact query
    const [itemRows] = await pool.execute(
      `SELECT
         SUM(items_viewed)       AS view_item,
         SUM(items_added_to_cart) AS add_to_cart,
         SUM(items_purchased)    AS purchase
       FROM agg_product_performance
       ${where}`,
      params
    );
    console.log("itemRows:", itemRows);

    const [[checkoutRow]] = await pool.execute(
      `SELECT SUM(items_checked_out) AS begin_checkout
       FROM ga4_item_interactions
       ${where}`,
      params
    );
    console.log("checkoutRow:", checkoutRow);

    const trafficWhere = "";
    const trafficParams = [];
    const [[trafficRow]] = await pool.execute(
      `SELECT SUM(sessions) AS sessions, SUM(conversions) AS conversions
       FROM kpi_daily_traffic ${trafficWhere}`,
      trafficParams
    );
    console.log("trafficRow:", trafficRow);

    // Testing logs query limit parameter issue
    try {
        const [logs] = await pool.execute(
            `SELECT al.*, u.email AS user_email FROM audit_logs al
             LEFT JOIN users u ON al.user_id = u.id
             ORDER BY al.created_at DESC LIMIT ? OFFSET ?`,
            [50, 0]
        );
        console.log("Logs array length:", logs.length);
    } catch(err) {
        console.error("Logs prepared statement error:", err.message);
    }

  } catch (err) {
    console.error("Error:", err.message);
  }
  process.exit();
}
check();
