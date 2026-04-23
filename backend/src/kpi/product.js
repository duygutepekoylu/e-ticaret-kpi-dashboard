'use strict';

// ga4_item_interactions + order_items + products → agg_product_performance
//
// KRİTİK: ga4_item_interactions ile ga4_traffic AYNI SORGUDA BİRLEŞTİRİLEMEZ.
//         GA4 API kısıtı — item-scoped vs session-scoped boyutlar.
//         Bu dosyada ga4_traffic'e hiçbir referans yoktur.
async function compute(conn, refreshLogId) {
  // GA4 item-scoped metrikler — tarih + item_id bazında
  const [ga4Rows] = await conn.execute(`
    SELECT
      g.date,
      g.item_id,
      p.product_name,
      p.category,
      p.brand,
      SUM(g.item_list_views)       AS item_list_views,
      SUM(g.item_list_clicks)      AS item_list_clicks,
      SUM(g.items_viewed)          AS items_viewed,
      SUM(g.items_added_to_cart)   AS items_added_to_cart,
      SUM(g.items_purchased)       AS items_purchased
    FROM ga4_item_interactions g
    JOIN products p ON g.item_id = p.sku
    GROUP BY g.date, g.item_id, p.product_name, p.category, p.brand
  `);

  if (ga4Rows.length === 0) return 0;

  // E-ticaret metrikleri — order_items tablosundan tarih + item_id bazında
  // google_ads.product_item_id nullable olduğu için LEFT JOIN — burada order_items ile
  const [orderRows] = await conn.execute(`
    SELECT
      DATE(o.order_date)        AS date,
      oi.item_id,
      COUNT(DISTINCT oi.order_id) AS orders_count,
      SUM(oi.line_total)         AS revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.order_id
    WHERE o.order_status IN ('completed', 'shipped')
    GROUP BY DATE(o.order_date), oi.item_id
  `);

  function toDateStr(v) {
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return String(v).slice(0, 10);
  }

  const orderMap = {};
  for (const r of orderRows) {
    orderMap[`${toDateStr(r.date)}|${r.item_id}`] = {
      orders_count: Number(r.orders_count) || 0,
      revenue: Number(r.revenue) || 0,
    };
  }

  await conn.execute('DELETE FROM agg_product_performance');

  const values = ga4Rows.map(r => {
    const dateStr = toDateStr(r.date);
    const key = `${dateStr}|${r.item_id}`;
    const ord = orderMap[key] || { orders_count: 0, revenue: 0 };
    const itemsViewed = Number(r.items_viewed) || 0;
    const itemsPurchased = Number(r.items_purchased) || 0;
    const itemsAddedToCart = Number(r.items_added_to_cart) || 0;

    return [
      dateStr,
      r.item_id,
      refreshLogId,
      r.product_name,
      r.category,
      r.brand,
      r.item_list_views,
      r.item_list_clicks,
      itemsViewed,
      itemsAddedToCart,
      itemsPurchased,
      ord.orders_count,
      ord.revenue,
      itemsViewed > 0 ? itemsAddedToCart / itemsViewed : 0,  // cart_to_view_rate
      itemsViewed > 0 ? itemsPurchased / itemsViewed : 0,    // purchase_rate
    ];
  });

  await conn.query(
    `INSERT INTO agg_product_performance
      (date, item_id, refresh_log_id,
       product_name, category, brand,
       item_list_views, item_list_clicks,
       items_viewed, items_added_to_cart, items_purchased,
       orders_count, revenue,
       cart_to_view_rate, purchase_rate)
     VALUES ?`,
    [values]
  );

  return values.length;
}

module.exports = { compute };
