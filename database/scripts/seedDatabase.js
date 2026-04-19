'use strict';

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: 'rootroot',
  database: 'sporthink',
};

const FIXTURES_DIR = path.join(__dirname, '../fixtures/raw');

// ----------------------------------------------------------------
// Yardımcı fonksiyonlar
// ----------------------------------------------------------------

function readCsv(filename) {
  const filePath = path.join(FIXTURES_DIR, filename);
  const content = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return parse(content, { columns: true, skip_empty_lines: true, trim: true });
}

function toNull(val) {
  if (val === '' || val === null || val === undefined) return null;
  return val;
}

function toBool(val) {
  return (val === 'True' || val === 'true' || val === '1') ? 1 : 0;
}

function toDecimal(val) {
  if (val === '' || val === null || val === undefined) return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function toInt(val) {
  if (val === '' || val === null || val === undefined) return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

async function batchInsert(conn, table, rows, valuesFn, batchSize = 500) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const rowValues = batch.map(valuesFn);
    const colCount = rowValues[0].length;
    const placeholders = rowValues.map(() => `(${Array(colCount).fill('?').join(',')})`).join(',');
    await conn.query(`${rowValues._sql} ${placeholders}`, rowValues.flat());
    inserted += batch.length;
    process.stdout.write(`\r  → ${inserted}/${rows.length}`);
  }
  console.log();
  return inserted;
}

// Basit batch insert yardımcısı
async function insertBatch(conn, sql, rows, mapFn, batchSize = 500) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const mapped = batch.map(mapFn);
    const colCount = mapped[0].length;
    const placeholders = mapped.map(() => `(${Array(colCount).fill('?').join(',')})`).join(',');
    await conn.query(`${sql} ${placeholders}`, mapped.flat());
    inserted += batch.length;
    process.stdout.write(`\r  → ${inserted}/${rows.length}`);
  }
  console.log();
  return inserted;
}

// ----------------------------------------------------------------
// Ana seed fonksiyonu
// ----------------------------------------------------------------

async function seed() {
  const conn = await mysql.createConnection(DB_CONFIG);
  console.log('✅ MySQL bağlantısı kuruldu\n');

  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    // ----------------------------------------------------------------
    // 0. Seed kullanıcısı (imports tablosu FK için)
    // ----------------------------------------------------------------
    console.log('👤 Seed kullanıcısı oluşturuluyor...');
    await conn.query(`
      INSERT IGNORE INTO users (email, password_hash, full_name, role, is_active)
      VALUES ('seed@sporthink.com', '$2b$10$seed_placeholder_hash_for_testing_only', 'Seed User', 'admin', 1)
    `);
    const [[seedUser]] = await conn.query("SELECT id FROM users WHERE email = 'seed@sporthink.com'");
    const seedUserId = seedUser.id;
    console.log(`  → user_id: ${seedUserId}\n`);

    // ----------------------------------------------------------------
    // 1a. products
    // ----------------------------------------------------------------
    console.log('📦 products yükleniyor...');
    const products = readCsv('products.csv');
    await insertBatch(
      conn,
      `INSERT INTO products (sku, product_name, category, sub_category, brand, gender, price, cost_price, stock_quantity, is_active, created_at, color, size_range) VALUES`,
      products,
      (r) => [
        r.sku,
        r.product_name,
        r.category,
        r.sub_category,
        r.brand,
        r.gender,
        toDecimal(r.price),
        toDecimal(r.cost_price),
        toInt(r.stock_quantity),
        toBool(r.is_active),
        r.created_at,
        r.color,
        r.size_range,
      ]
    );

    // ----------------------------------------------------------------
    // 1b. customers
    // ----------------------------------------------------------------
    console.log('👥 customers yükleniyor...');
    const customers = readCsv('customers.csv');
    await insertBatch(
      conn,
      `INSERT INTO customers (customer_id, customer_name, first_order_date, registration_date, city, gender, age_group, registration_source, is_newsletter_subscriber, total_orders, total_revenue, last_order_date) VALUES`,
      customers,
      (r) => [
        r.customer_id,
        r.customer_name,
        toNull(r.first_order_date),
        r.registration_date,
        r.city,
        r.gender,
        r.age_group,
        r.registration_source,
        toBool(r.is_newsletter_subscriber),
        toInt(r.total_orders) || 0,
        toDecimal(r.total_revenue) || 0,
        toNull(r.last_order_date),
      ]
    );

    // ----------------------------------------------------------------
    // 1c. campaigns
    // ----------------------------------------------------------------
    console.log('📣 campaigns yükleniyor...');
    const campaigns = readCsv('campaigns.csv');
    await insertBatch(
      conn,
      `INSERT INTO campaigns (campaign_name, platform, campaign_type, objective, start_date, end_date, daily_budget, total_budget, target_audience, status) VALUES`,
      campaigns,
      (r) => [
        r.campaign_name,
        r.platform,
        r.campaign_type,
        r.objective,
        r.start_date,
        r.end_date,
        toDecimal(r.daily_budget),
        toDecimal(r.total_budget),
        r.target_audience,
        r.status,
      ]
    );

    // ----------------------------------------------------------------
    // 1d. channel_mapping
    // ----------------------------------------------------------------
    console.log('🗺️  channel_mapping yükleniyor...');
    const channelMapping = readCsv('channel_mapping.csv');
    await insertBatch(
      conn,
      `INSERT INTO channel_mapping (source, medium, channel_group) VALUES`,
      channelMapping,
      (r) => [r.source, r.medium, r.channel_group]
    );

    // ----------------------------------------------------------------
    // 2a. orders
    // ----------------------------------------------------------------
    console.log('🛒 orders yükleniyor...');
    const orders = readCsv('orders.csv');
    await insertBatch(
      conn,
      `INSERT INTO orders (order_id, order_date, customer_id, city, device, channel, source, medium, campaign_name, coupon_code, product_count, order_revenue, shipping_cost, discount_amount, refund_amount, net_revenue, order_status, payment_method) VALUES`,
      orders,
      (r) => [
        r.order_id,
        r.order_date,
        r.customer_id,
        r.city,
        r.device,
        r.channel,
        r.source,
        r.medium,
        toNull(r.campaign_name),
        toNull(r.coupon_code),
        toInt(r.product_count),
        toDecimal(r.order_revenue),
        toDecimal(r.shipping_cost) || 0,
        toDecimal(r.discount_amount) || 0,
        toDecimal(r.refund_amount) || 0,
        toDecimal(r.net_revenue),
        r.order_status,
        r.payment_method,
      ]
    );

    // ----------------------------------------------------------------
    // 2b. order_items
    // ----------------------------------------------------------------
    console.log('📋 order_items yükleniyor...');
    const orderItems = readCsv('order_items.csv');
    await insertBatch(
      conn,
      `INSERT INTO order_items (order_id, line_id, item_id, item_name, item_category, item_category2, item_brand, quantity, unit_price, line_total, discount_amount, refund_amount) VALUES`,
      orderItems,
      (r) => [
        r.order_id,
        toInt(r.line_id),
        r.item_id,
        r.item_name,
        r.item_category,
        r.item_category2,
        r.item_brand,
        toInt(r.quantity),
        toDecimal(r.unit_price),
        toDecimal(r.line_total),
        toDecimal(r.discount_amount) || 0,
        toDecimal(r.refund_amount) || 0,
      ]
    );

    // ----------------------------------------------------------------
    // 3. imports tablosuna kayıtlar oluştur (raw tablolar için)
    // ----------------------------------------------------------------
    console.log('\n📥 imports kayıtları oluşturuluyor...');

    const importSources = [
      { source_table: 'raw_ga4_traffic',              filename: 'ga4_traffic.csv' },
      { source_table: 'raw_ga4_item_interactions',    filename: 'ga4_item_interactions.csv' },
      { source_table: 'raw_meta_ads',                 filename: 'meta_ads.csv' },
      { source_table: 'raw_meta_ads_breakdowns',      filename: 'meta_ads_breakdowns.csv' },
      { source_table: 'raw_google_ads',               filename: 'google_ads.csv' },
    ];

    const importIds = {};
    for (const src of importSources) {
      const [result] = await conn.query(
        `INSERT INTO imports (user_id, source_table, filename, file_type, status, started_at, completed_at)
         VALUES (?, ?, ?, 'csv', 'committed', NOW(), NOW())`,
        [seedUserId, src.source_table, src.filename]
      );
      importIds[src.source_table] = result.insertId;
      console.log(`  → ${src.source_table}: import_id = ${result.insertId}`);
    }

    // ----------------------------------------------------------------
    // 4a. raw_ga4_traffic (ham veri — dönüşüm yapılmaz)
    // ----------------------------------------------------------------
    console.log('\n🔵 raw_ga4_traffic yükleniyor...');
    const ga4Traffic = readCsv('ga4_traffic.csv');
    const impIdGa4Traffic = importIds['raw_ga4_traffic'];
    await insertBatch(
      conn,
      `INSERT INTO raw_ga4_traffic (import_id, date, sessionSource, sessionMedium, sessionCampaignName, sessionDefaultChannelGroup, deviceCategory, city, landingPagePlusQueryString, newVsReturning, sessions, totalUsers, newUsers, bounceRate, averageSessionDuration, screenPageViewsPerSession, engagedSessions, engagementRate, userEngagementDuration, conversions, purchaseRevenue, transactions) VALUES`,
      ga4Traffic,
      (r) => [
        impIdGa4Traffic,
        r.date,
        r.sessionSource,
        r.sessionMedium,
        r.sessionCampaignName,
        r.sessionDefaultChannelGroup,
        r.deviceCategory,
        r.city,
        toNull(r.landingPagePlusQueryString),
        r.newVsReturning,
        toNull(r.sessions),
        toNull(r.totalUsers),
        toNull(r.newUsers),
        toNull(r.bounceRate),
        toNull(r.averageSessionDuration),
        toNull(r.screenPageViewsPerSession),
        toNull(r.engagedSessions),
        toNull(r.engagementRate),
        toNull(r.userEngagementDuration),
        toNull(r.conversions),
        toNull(r.purchaseRevenue),
        toNull(r.transactions),
      ]
    );

    // ----------------------------------------------------------------
    // 4b. raw_ga4_item_interactions (ham veri)
    // ----------------------------------------------------------------
    console.log('🔵 raw_ga4_item_interactions yükleniyor...');
    const ga4Items = readCsv('ga4_item_interactions.csv');
    const impIdGa4Items = importIds['raw_ga4_item_interactions'];
    await insertBatch(
      conn,
      `INSERT INTO raw_ga4_item_interactions (import_id, date, itemId, itemName, itemCategory, itemCategory2, itemBrand, itemsViewed, itemsAddedToCart, itemsCheckedOut, itemsPurchased, itemRevenue, itemListViews, itemListClicks, cartToViewRate) VALUES`,
      ga4Items,
      (r) => [
        impIdGa4Items,
        r.date,
        r.itemId,
        r.itemName,
        r.itemCategory,
        r.itemCategory2,
        r.itemBrand,
        toNull(r.itemsViewed),
        toNull(r.itemsAddedToCart),
        toNull(r.itemsCheckedOut),
        toNull(r.itemsPurchased),
        toNull(r.itemRevenue),
        toNull(r.itemListViews),
        toNull(r.itemListClicks),
        toNull(r.cartToViewRate),
      ]
    );

    // ----------------------------------------------------------------
    // 4c. raw_meta_ads (ham veri — kolon adları CSV'den DB'ye map edilir)
    // CSV kolon adı → DB kolon adı:
    //   actions:link_click              → actions_link_click
    //   actions:landing_page_view       → actions_landing_page_view
    //   actions:offsite_conversion.*    → actions_fb_pixel_*
    //   action_values:offsite_conv.*    → action_values_fb_pixel_purchase
    // ----------------------------------------------------------------
    console.log('🟠 raw_meta_ads yükleniyor...');
    const metaAds = readCsv('meta_ads.csv');
    const impIdMetaAds = importIds['raw_meta_ads'];
    await insertBatch(
      conn,
      `INSERT INTO raw_meta_ads (import_id, date_start, date_stop, account_id, account_name, campaign_id, campaign_name, adset_id, adset_name, ad_id, ad_name, objective, buying_type, impressions, reach, frequency, clicks, inline_link_clicks, spend, cpc, cpm, cpp, ctr, inline_link_click_ctr, actions_link_click, actions_landing_page_view, actions_fb_pixel_view_content, actions_fb_pixel_add_to_cart, actions_fb_pixel_initiate_checkout, actions_fb_pixel_purchase, action_values_fb_pixel_purchase, actions_page_engagement, actions_post_engagement, actions_video_view) VALUES`,
      metaAds,
      (r) => [
        impIdMetaAds,
        toNull(r['date_start']),
        toNull(r['date_stop']),
        toNull(r['account_id']),
        toNull(r['account_name']),
        toNull(r['campaign_id']),
        toNull(r['campaign_name']),
        toNull(r['adset_id']),
        toNull(r['adset_name']),
        toNull(r['ad_id']),
        toNull(r['ad_name']),
        toNull(r['objective']),
        toNull(r['buying_type']),
        toNull(r['impressions']),
        toNull(r['reach']),
        toNull(r['frequency']),
        toNull(r['clicks']),
        toNull(r['inline_link_clicks']),
        toNull(r['spend']),
        toNull(r['cpc']),
        toNull(r['cpm']),
        toNull(r['cpp']),
        toNull(r['ctr']),
        toNull(r['inline_link_click_ctr']),
        toNull(r['actions:link_click']),
        toNull(r['actions:landing_page_view']),
        toNull(r['actions:offsite_conversion.fb_pixel_view_content']),
        toNull(r['actions:offsite_conversion.fb_pixel_add_to_cart']),
        toNull(r['actions:offsite_conversion.fb_pixel_initiate_checkout']),
        toNull(r['actions:offsite_conversion.fb_pixel_purchase']),
        toNull(r['action_values:offsite_conversion.fb_pixel_purchase']),
        toNull(r['actions:page_engagement']),
        toNull(r['actions:post_engagement']),
        toNull(r['actions:video_view']),
      ]
    );

    // ----------------------------------------------------------------
    // 4d. raw_meta_ads_breakdowns (ham veri)
    // ----------------------------------------------------------------
    console.log('🟠 raw_meta_ads_breakdowns yükleniyor...');
    const metaBd = readCsv('meta_ads_breakdowns.csv');
    const impIdMetaBd = importIds['raw_meta_ads_breakdowns'];
    await insertBatch(
      conn,
      `INSERT INTO raw_meta_ads_breakdowns (import_id, date_start, date_stop, campaign_name, adset_name, ad_name, publisher_platform, platform_position, impression_device, impressions, clicks, spend) VALUES`,
      metaBd,
      (r) => [
        impIdMetaBd,
        toNull(r.date_start),
        toNull(r.date_stop),
        toNull(r.campaign_name),
        toNull(r.adset_name),
        toNull(r.ad_name),
        toNull(r.publisher_platform),
        toNull(r.platform_position),
        toNull(r.impression_device),
        toNull(r.impressions),
        toNull(r.clicks),
        toNull(r.spend),
      ]
    );

    // ----------------------------------------------------------------
    // 4e. raw_google_ads (ham veri — noktalı kolon adları DB ile aynı)
    // ----------------------------------------------------------------
    console.log('🟢 raw_google_ads yükleniyor...');
    const googleAds = readCsv('google_ads.csv');
    const impIdGoogle = importIds['raw_google_ads'];
    await insertBatch(
      conn,
      'INSERT INTO raw_google_ads (import_id, `segments.date`, `customer.id`, `customer.descriptive_name`, `campaign.id`, `campaign.name`, `campaign.status`, `campaign.advertising_channel_type`, `ad_group.id`, `ad_group.name`, `ad_group.status`, `segments.device`, `segments.ad_network_type`, `segments.product_item_id`, `segments.product_title`, `segments.product_brand`, `segments.product_type_l1`, `segments.product_type_l2`, `ad_group_criterion.keyword.text`, `ad_group_criterion.keyword.match_type`, `metrics.impressions`, `metrics.clicks`, `metrics.cost_micros`, `metrics.ctr`, `metrics.average_cpc`, `metrics.average_cpm`, `metrics.conversions`, `metrics.conversions_value`, `metrics.all_conversions`, `metrics.all_conversions_value`, `metrics.cost_per_conversion`, `metrics.conversions_from_interactions_rate`, `metrics.value_per_conversion`, `metrics.search_impression_share`, `metrics.search_budget_lost_impression_share`, `metrics.search_rank_lost_impression_share`, `metrics.view_through_conversions`, `metrics.interaction_rate`) VALUES',
      googleAds,
      (r) => [
        impIdGoogle,
        toNull(r['segments.date']),
        toNull(r['customer.id']),
        toNull(r['customer.descriptive_name']),
        toNull(r['campaign.id']),
        toNull(r['campaign.name']),
        toNull(r['campaign.status']),
        toNull(r['campaign.advertising_channel_type']),
        toNull(r['ad_group.id']),
        toNull(r['ad_group.name']),
        toNull(r['ad_group.status']),
        toNull(r['segments.device']),
        toNull(r['segments.ad_network_type']),
        toNull(r['segments.product_item_id']),
        toNull(r['segments.product_title']),
        toNull(r['segments.product_brand']),
        toNull(r['segments.product_type_l1']),
        toNull(r['segments.product_type_l2']),
        toNull(r['ad_group_criterion.keyword.text']),
        toNull(r['ad_group_criterion.keyword.match_type']),
        toNull(r['metrics.impressions']),
        toNull(r['metrics.clicks']),
        toNull(r['metrics.cost_micros']),
        toNull(r['metrics.ctr']),
        toNull(r['metrics.average_cpc']),
        toNull(r['metrics.average_cpm']),
        toNull(r['metrics.conversions']),
        toNull(r['metrics.conversions_value']),
        toNull(r['metrics.all_conversions']),
        toNull(r['metrics.all_conversions_value']),
        toNull(r['metrics.cost_per_conversion']),
        toNull(r['metrics.conversions_from_interactions_rate']),
        toNull(r['metrics.value_per_conversion']),
        toNull(r['metrics.search_impression_share']),
        toNull(r['metrics.search_budget_lost_impression_share']),
        toNull(r['metrics.search_rank_lost_impression_share']),
        toNull(r['metrics.view_through_conversions']),
        toNull(r['metrics.interaction_rate']),
      ]
    );

    // ----------------------------------------------------------------
    // 5. imports tablosunu satır sayılarıyla güncelle
    // ----------------------------------------------------------------
    console.log('\n📊 imports kayıtları güncelleniyor...');
    const tableToImport = {
      raw_ga4_traffic:           importIds['raw_ga4_traffic'],
      raw_ga4_item_interactions: importIds['raw_ga4_item_interactions'],
      raw_meta_ads:              importIds['raw_meta_ads'],
      raw_meta_ads_breakdowns:   importIds['raw_meta_ads_breakdowns'],
      raw_google_ads:            importIds['raw_google_ads'],
    };
    for (const [table, impId] of Object.entries(tableToImport)) {
      const [[countRow]] = await conn.query(`SELECT COUNT(*) AS cnt FROM \`${table}\` WHERE import_id = ?`, [impId]);
      await conn.query(
        `UPDATE imports SET status='committed', total_rows=?, success_rows=?, error_rows=0, completed_at=NOW() WHERE id=?`,
        [countRow.cnt, countRow.cnt, impId]
      );
      console.log(`  → ${table}: ${countRow.cnt} satır`);
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n✅ Seed tamamlandı.\n');

  } catch (err) {
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.error('\n❌ Seed hatası:', err.message);
    throw err;
  } finally {
    await conn.end();
  }
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
