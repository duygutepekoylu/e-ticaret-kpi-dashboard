require('dotenv').config();
const { pool } = require('./src/config/database');

async function check() {
  try {
    const [cols] = await pool.execute("SHOW COLUMNS FROM agg_product_performance");
    console.log("agg_product_performance columns:", cols.map(c => c.Field));

    const [cols2] = await pool.execute("SHOW COLUMNS FROM kpi_daily_traffic");
    console.log("kpi_daily_traffic columns:", cols2.map(c => c.Field));
  } catch (err) {
    console.error("Error:", err.message);
  }
  process.exit();
}
check();
