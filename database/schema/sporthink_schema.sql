-- ============================================================
-- SPORTHINK KPI DASHBOARD — MySQL Schema
-- Oluşturma Tarihi: 2025
-- Toplam Tablo: 32
-- ============================================================
-- Oluşturma Sırası (FK bağımlılıklarına göre):
-- 1. Bağımsız master tablolar (users, products, customers, campaigns, channel_mapping)
-- 2. E-ticaret (orders, order_items)
-- 3. Import sistemi (imports, mappings, errors)
-- 4. Raw tablolar (import'a bağlı)
-- 5. Clean analitik tablolar (raw + master'a bağlı)
-- 6. Güvenlik ve sistem (users'a bağlı)
-- 7. KPI ve aggregation (refresh_logs'a bağlı)
-- ============================================================

CREATE DATABASE IF NOT EXISTS sporthink
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sporthink;

-- ============================================================
-- GRUP 1: BAĞIMSIZ MASTER TABLOLAR
-- ============================================================

-- ------------------------------------------------------------
-- users
-- Dashboard'a giriş yapan Sporthink çalışanları
-- NOT: customers tablosundan farklı — bu sistem kullanıcıları
-- ------------------------------------------------------------
CREATE TABLE users (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(255)    NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    full_name       VARCHAR(255)    NOT NULL,
    role            ENUM('admin','marketing','viewer') NOT NULL DEFAULT 'viewer',
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    last_login_at   DATETIME        NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- products
-- Ürün master tablosu — tüm platformların ürün join noktası
-- PK: sku (natural key, stabil, değişmez)
-- BAĞLANAN: order_items.item_id, ga4_item_interactions.item_id,
--           google_ads.product_item_id (nullable),
--           agg_product_performance.item_id
-- ------------------------------------------------------------
CREATE TABLE products (
    sku             VARCHAR(50)     NOT NULL PRIMARY KEY,
    product_name    VARCHAR(500)    NOT NULL,
    category        VARCHAR(100)    NOT NULL,
    sub_category    VARCHAR(100)    NOT NULL,
    brand           VARCHAR(100)    NOT NULL,
    gender          VARCHAR(20)     NOT NULL COMMENT 'Erkek, Kadın, Unisex',
    price           DECIMAL(10,2)   NOT NULL,
    cost_price      DECIMAL(10,2)   NOT NULL COMMENT 'Kâr marjı analizi için',
    stock_quantity  INT             NOT NULL DEFAULT 0,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      DATE            NOT NULL,
    color           VARCHAR(100)    NOT NULL,
    size_range      VARCHAR(50)     NOT NULL COMMENT 'Ayakkabı: 36-46, Giyim: S-XL'
);

-- ------------------------------------------------------------
-- customers
-- Müşteri master tablosu — cohort ve CLV analizi için
-- PK: customer_id (natural key, sistem üretir, değişmez)
-- BAĞLANAN: orders.customer_id
-- NOT: users tablosundan farklı — bunlar alışveriş yapan müşteriler
-- ------------------------------------------------------------
CREATE TABLE customers (
    customer_id                 VARCHAR(20)     NOT NULL PRIMARY KEY,
    customer_name               VARCHAR(255)    NOT NULL,
    first_order_date            DATE            NULL     COMMENT 'Cohort belirleme için',
    registration_date           DATE            NOT NULL,
    city                        VARCHAR(100)    NOT NULL,
    gender                      CHAR(1)         NOT NULL COMMENT 'M veya F',
    age_group                   VARCHAR(10)     NOT NULL COMMENT '18-24, 25-34, 35-44, 45-54, 55+',
    registration_source         VARCHAR(100)    NOT NULL COMMENT 'Organic Search, Paid Social, Direct, Email',
    is_newsletter_subscriber    TINYINT(1)      NOT NULL DEFAULT 0,
    total_orders                INT             NOT NULL DEFAULT 0 COMMENT 'Repeat purchase rate için',
    total_revenue               DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT 'CLV hesabı için',
    last_order_date             DATE            NULL     COMMENT 'Recency hesabı için'
);

-- ------------------------------------------------------------
-- campaigns
-- Meta ve Google Ads kampanya master tablosu
-- PK: campaign_name (natural key — spesifikasyon "campaign_name
--     ile diğer tablolara bağlanır" diyor)
-- BAĞLANAN: orders, meta_ads, meta_ads_breakdowns,
--           google_ads, ga4_traffic (soft), agg_campaign_performance
-- NOT: id surrogate key ek olarak var ama join'ler campaign_name üzerinden
-- ------------------------------------------------------------
CREATE TABLE campaigns (
    id              INT             AUTO_INCREMENT UNIQUE,
    campaign_name   VARCHAR(255)    NOT NULL PRIMARY KEY,
    platform        VARCHAR(20)     NOT NULL COMMENT 'meta, google',
    campaign_type   VARCHAR(100)    NOT NULL COMMENT 'OUTCOME_SALES, SEARCH, SHOPPING vb.',
    objective       VARCHAR(100)    NOT NULL COMMENT 'Awareness, Traffic, Conversion, Retargeting',
    start_date      DATE            NOT NULL,
    end_date        DATE            NOT NULL,
    daily_budget    DECIMAL(10,2)   NOT NULL,
    total_budget    DECIMAL(10,2)   NOT NULL,
    target_audience VARCHAR(500)    NOT NULL,
    status          VARCHAR(20)     NOT NULL COMMENT 'active, paused, completed'
);

-- ------------------------------------------------------------
-- channel_mapping
-- source + medium → channel_group normalizasyonu
-- PK: source + medium (composite natural key, değişmez)
-- BAĞLANTI: Hard FK yok — soft reference
--   orders.source + orders.medium → buraya lookup
--   ga4_traffic.session_source + session_medium → buraya lookup
-- NOT: Import sırasında orders source+medium bu tabloda kontrol edilir
-- ------------------------------------------------------------
CREATE TABLE channel_mapping (
    source          VARCHAR(100)    NOT NULL,
    medium          VARCHAR(100)    NOT NULL,
    channel_group   VARCHAR(100)    NOT NULL COMMENT 'Organic Search, Paid Search, Paid Social, Direct, Email, Referral vb.',
    PRIMARY KEY (source, medium)
);

-- ============================================================
-- GRUP 2: E-TİCARET TABLOLARI
-- ============================================================

-- ------------------------------------------------------------
-- orders
-- Sipariş başlık tablosu — Sporthink e-ticaret DB'sinden
-- PK: order_id (natural key)
-- FK: customer_id → customers (hard)
--     campaign_name → campaigns (soft — nullable, organic trafikte NULL)
--     source + medium → channel_mapping (soft — import'ta kontrol)
-- KRİTİK: channel/source/medium GA4 attribution ile uyumlu olmalı
--         Satışın gerçek kaynağı GA4'ten okunacak (toplantı kararı)
-- ------------------------------------------------------------
CREATE TABLE orders (
    order_id        VARCHAR(30)     NOT NULL PRIMARY KEY,
    order_date      DATETIME        NOT NULL,
    customer_id     VARCHAR(20)     NOT NULL,
    city            VARCHAR(100)    NOT NULL,
    device          VARCHAR(20)     NOT NULL COMMENT 'mobile, desktop, tablet',
    channel         VARCHAR(100)    NOT NULL COMMENT 'GA4 sessionDefaultChannelGroup ile uyumlu',
    source          VARCHAR(100)    NOT NULL COMMENT 'GA4 sessionSource ile uyumlu',
    medium          VARCHAR(100)    NOT NULL COMMENT 'GA4 sessionMedium ile uyumlu',
    campaign_name   VARCHAR(255)    NULL     COMMENT 'Nullable — organic/direct trafikte NULL',
    coupon_code     VARCHAR(50)     NULL,
    product_count   INT             NOT NULL DEFAULT 0,
    order_revenue   DECIMAL(10,2)   NOT NULL,
    shipping_cost   DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    refund_amount   DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    net_revenue     DECIMAL(10,2)   NOT NULL COMMENT 'order_revenue - discount_amount - refund_amount',
    order_status    VARCHAR(20)     NOT NULL COMMENT 'completed, cancelled, refunded, pending, shipped',
    payment_method  VARCHAR(50)     NOT NULL COMMENT 'credit_card, debit_card, bank_transfer, pay_at_door',

    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

-- ------------------------------------------------------------
-- order_items
-- Sipariş kalem tablosu
-- PK: order_id + line_id (composite natural key)
-- FK: order_id → orders (hard)
--     item_id → products.sku (hard)
-- KRİTİK: item_id tüm platformlar arası birleştirme anahtarı
--   = ga4_item_interactions.item_id
--   = google_ads.product_item_id
--   = products.sku
-- ------------------------------------------------------------
CREATE TABLE order_items (
    order_id        VARCHAR(30)     NOT NULL,
    line_id         INT             NOT NULL,
    item_id         VARCHAR(50)     NOT NULL,
    item_name       VARCHAR(500)    NOT NULL,
    item_category   VARCHAR(100)    NOT NULL,
    item_category2  VARCHAR(100)    NOT NULL,
    item_brand      VARCHAR(100)    NOT NULL,
    quantity        INT             NOT NULL DEFAULT 1,
    unit_price      DECIMAL(10,2)   NOT NULL,
    line_total      DECIMAL(10,2)   NOT NULL COMMENT 'quantity × unit_price',
    discount_amount DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    refund_amount   DECIMAL(10,2)   NOT NULL DEFAULT 0.00,

    PRIMARY KEY (order_id, line_id),

    CONSTRAINT fk_order_items_order
        FOREIGN KEY (order_id) REFERENCES orders(order_id),
    CONSTRAINT fk_order_items_product
        FOREIGN KEY (item_id) REFERENCES products(sku)
);

-- ============================================================
-- GRUP 3: IMPORT SİSTEMİ
-- ============================================================

-- ------------------------------------------------------------
-- imports
-- Her import işleminin geçmişi ve durumu
-- PK: id (surrogate)
-- FK: user_id → users (hard — kim yükledi)
-- BAĞLANAN: raw tablolar, import_column_mappings, import_errors
-- ------------------------------------------------------------
CREATE TABLE imports (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    user_id         INT             NOT NULL,
    source_table    VARCHAR(100)    NOT NULL COMMENT 'ga4_traffic, meta_ads, google_ads vb.',
    filename        VARCHAR(500)    NOT NULL,
    file_type       VARCHAR(10)     NOT NULL COMMENT 'csv, xlsx, json',
    status          VARCHAR(20)     NOT NULL DEFAULT 'pending'
                                    COMMENT 'pending, mapping, validating, committed, failed, rolled_back',
    total_rows      INT             NULL,
    success_rows    INT             NULL,
    error_rows      INT             NULL,
    error_message   TEXT            NULL,
    started_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at    DATETIME        NULL,

    CONSTRAINT fk_imports_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------
-- import_column_mappings
-- CSV sütunu → DB sütunu eşleme
-- PK: id (surrogate)
-- FK: import_id → imports (hard)
-- ------------------------------------------------------------
CREATE TABLE import_column_mappings (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    import_id       INT             NOT NULL,
    source_column   VARCHAR(255)    NOT NULL COMMENT 'CSV deki sütun adı (sessionSource, metrics.cost_micros vb.)',
    target_column   VARCHAR(255)    NOT NULL COMMENT 'DB deki sütun adı (session_source, cost_tl vb.)',
    data_type       VARCHAR(50)     NOT NULL COMMENT 'VARCHAR, INT, DECIMAL, DATE, DATETIME',
    transformation  VARCHAR(255)    NULL     COMMENT 'Dönüşüm kuralı (÷1000000, ÷100, YYYYMMDD→DATE vb.)',

    CONSTRAINT fk_col_mappings_import
        FOREIGN KEY (import_id) REFERENCES imports(id)
);

-- ------------------------------------------------------------
-- import_errors
-- Import sırasında hata veren satırlar
-- PK: id (surrogate)
-- FK: import_id → imports (hard)
-- ------------------------------------------------------------
CREATE TABLE import_errors (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    import_id       INT             NOT NULL,
    `row_number`    INT             NOT NULL COMMENT 'CSV deki satır numarası',
    raw_data        TEXT            NOT NULL COMMENT 'Ham satır verisi',
    error_message   VARCHAR(1000)   NOT NULL COMMENT 'Hatanın nedeni',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_import_errors_import
        FOREIGN KEY (import_id) REFERENCES imports(id)
);

-- ============================================================
-- GRUP 4: RAW TABLOLAR
-- Ham veri katmanı — dönüşüm uygulanmamış
-- Her raw tabloda: id (PK), import_id (FK → imports)
-- Geriye dönük kontrol ve hata ayıklama için
-- NOT: Sadece dış API kaynaklı tablolar raw tutulur
--      orders/order_items Sporthink kendi DB'sinden geldiği için raw yok
-- ============================================================

-- ------------------------------------------------------------
-- raw_ga4_traffic
-- GA4 API'den geldiği gibi — date int, camelCase sütunlar
-- ------------------------------------------------------------
CREATE TABLE raw_ga4_traffic (
    id                          INT             AUTO_INCREMENT PRIMARY KEY,
    import_id                   INT             NOT NULL,
    date                        BIGINT          NOT NULL COMMENT 'YYYYMMDD formatı int (20241001)',
    sessionSource               VARCHAR(100)    NULL,
    sessionMedium               VARCHAR(100)    NULL,
    sessionCampaignName         VARCHAR(255)    NULL,
    sessionDefaultChannelGroup  VARCHAR(100)    NULL,
    deviceCategory              VARCHAR(20)     NULL,
    city                        VARCHAR(100)    NULL,
    landingPagePlusQueryString  TEXT            NULL,
    newVsReturning              VARCHAR(20)     NULL,
    sessions                    INT             NULL,
    totalUsers                  INT             NULL,
    newUsers                    INT             NULL,
    bounceRate                  DECIMAL(5,4)    NULL COMMENT '0-1 arası float',
    averageSessionDuration      DECIMAL(10,2)   NULL,
    screenPageViewsPerSession   DECIMAL(5,2)    NULL,
    engagedSessions             INT             NULL,
    engagementRate              DECIMAL(5,4)    NULL,
    userEngagementDuration      DECIMAL(15,2)   NULL,
    conversions                 INT             NULL,
    purchaseRevenue             DECIMAL(10,2)   NULL,
    transactions                INT             NULL,

    CONSTRAINT fk_raw_ga4_traffic_import
        FOREIGN KEY (import_id) REFERENCES imports(id)
);

-- ------------------------------------------------------------
-- raw_ga4_item_interactions
-- GA4 item-scoped API'den geldiği gibi — date int, camelCase
-- ------------------------------------------------------------
CREATE TABLE raw_ga4_item_interactions (
    id                  INT             AUTO_INCREMENT PRIMARY KEY,
    import_id           INT             NOT NULL,
    date                BIGINT          NOT NULL COMMENT 'YYYYMMDD formatı int',
    itemId              VARCHAR(50)     NULL,
    itemName            VARCHAR(500)    NULL,
    itemCategory        VARCHAR(100)    NULL,
    itemCategory2       VARCHAR(100)    NULL,
    itemBrand           VARCHAR(100)    NULL,
    itemsViewed         INT             NULL,
    itemsAddedToCart    INT             NULL,
    itemsCheckedOut     INT             NULL,
    itemsPurchased      INT             NULL,
    itemRevenue         DECIMAL(10,2)   NULL,
    itemListViews       INT             NULL,
    itemListClicks      INT             NULL,
    cartToViewRate      DECIMAL(5,4)    NULL,

    CONSTRAINT fk_raw_ga4_items_import
        FOREIGN KEY (import_id) REFERENCES imports(id)
);

-- ------------------------------------------------------------
-- raw_meta_ads
-- Meta Marketing API'den geldiği gibi
-- KRİTİK: Gerçek API'de TÜM metrikler STRING döner
--         Bu dummy veride zaten int/float — CLAUDE.md'ye not düşüldü
-- Action sütunları orijinal adlarıyla (iki nokta ve nokta içerir)
-- ------------------------------------------------------------
CREATE TABLE raw_meta_ads (
    id                                                      INT             AUTO_INCREMENT PRIMARY KEY,
    import_id                                               INT             NOT NULL,
    date_start                                              VARCHAR(20)     NULL,
    date_stop                                               VARCHAR(20)     NULL,
    account_id                                              VARCHAR(50)     NULL,
    account_name                                            VARCHAR(255)    NULL,
    campaign_id                                             VARCHAR(50)     NULL,
    campaign_name                                           VARCHAR(255)    NULL,
    adset_id                                                VARCHAR(50)     NULL,
    adset_name                                              VARCHAR(255)    NULL,
    ad_id                                                   VARCHAR(50)     NULL,
    ad_name                                                 VARCHAR(255)    NULL,
    objective                                               VARCHAR(100)    NULL,
    buying_type                                             VARCHAR(50)     NULL,
    impressions                                             VARCHAR(50)     NULL COMMENT 'Gerçek API STRING döner',
    reach                                                   VARCHAR(50)     NULL,
    frequency                                               VARCHAR(50)     NULL,
    clicks                                                  VARCHAR(50)     NULL,
    inline_link_clicks                                      VARCHAR(50)     NULL,
    spend                                                   VARCHAR(50)     NULL,
    cpc                                                     VARCHAR(50)     NULL,
    cpm                                                     VARCHAR(50)     NULL,
    cpp                                                     VARCHAR(50)     NULL,
    ctr                                                     VARCHAR(50)     NULL COMMENT 'Yüzde formatında (2.25 = %2.25)',
    inline_link_click_ctr                                   VARCHAR(50)     NULL,
    actions_link_click                                      VARCHAR(50)     NULL,
    actions_landing_page_view                               VARCHAR(50)     NULL,
    actions_fb_pixel_view_content                           VARCHAR(50)     NULL,
    actions_fb_pixel_add_to_cart                            VARCHAR(50)     NULL,
    actions_fb_pixel_initiate_checkout                      VARCHAR(50)     NULL,
    actions_fb_pixel_purchase                               VARCHAR(50)     NULL,
    action_values_fb_pixel_purchase                         VARCHAR(50)     NULL,
    actions_page_engagement                                 VARCHAR(50)     NULL,
    actions_post_engagement                                 VARCHAR(50)     NULL,
    actions_video_view                                      VARCHAR(50)     NULL,

    CONSTRAINT fk_raw_meta_ads_import
        FOREIGN KEY (import_id) REFERENCES imports(id)
);

-- ------------------------------------------------------------
-- raw_meta_ads_breakdowns
-- Meta breakdown API'den geldiği gibi
-- publisher_platform + platform_position + impression_device birlikte
-- ------------------------------------------------------------
CREATE TABLE raw_meta_ads_breakdowns (
    id                  INT             AUTO_INCREMENT PRIMARY KEY,
    import_id           INT             NOT NULL,
    date_start          VARCHAR(20)     NULL,
    date_stop           VARCHAR(20)     NULL,
    campaign_name       VARCHAR(255)    NULL,
    adset_name          VARCHAR(255)    NULL,
    ad_name             VARCHAR(255)    NULL,
    publisher_platform  VARCHAR(50)     NULL,
    platform_position   VARCHAR(100)    NULL,
    impression_device   VARCHAR(50)     NULL,
    impressions         VARCHAR(50)     NULL,
    clicks              VARCHAR(50)     NULL,
    spend               VARCHAR(50)     NULL,

    CONSTRAINT fk_raw_meta_bd_import
        FOREIGN KEY (import_id) REFERENCES imports(id)
);

-- ------------------------------------------------------------
-- raw_google_ads
-- Google Ads GAQL API'den geldiği gibi
-- KRİTİK: cost_micros ham hali (2800000000 = 2800 TL)
--         Noktalı sütun adları backtick ile tanımlandı
-- ------------------------------------------------------------
CREATE TABLE raw_google_ads (
    id                                              INT             AUTO_INCREMENT PRIMARY KEY,
    import_id                                       INT             NOT NULL,
    `segments.date`                                 VARCHAR(20)     NULL,
    `customer.id`                                   VARCHAR(50)     NULL,
    `customer.descriptive_name`                     VARCHAR(255)    NULL,
    `campaign.id`                                   VARCHAR(50)     NULL,
    `campaign.name`                                 VARCHAR(255)    NULL,
    `campaign.status`                               VARCHAR(20)     NULL,
    `campaign.advertising_channel_type`             VARCHAR(50)     NULL,
    `ad_group.id`                                   VARCHAR(50)     NULL,
    `ad_group.name`                                 VARCHAR(255)    NULL,
    `ad_group.status`                               VARCHAR(20)     NULL,
    `segments.device`                               VARCHAR(20)     NULL,
    `segments.ad_network_type`                      VARCHAR(50)     NULL,
    `segments.product_item_id`                      VARCHAR(50)     NULL,
    `segments.product_title`                        VARCHAR(500)    NULL,
    `segments.product_brand`                        VARCHAR(100)    NULL,
    `segments.product_type_l1`                      VARCHAR(100)    NULL,
    `segments.product_type_l2`                      VARCHAR(100)    NULL,
    `ad_group_criterion.keyword.text`               VARCHAR(255)    NULL,
    `ad_group_criterion.keyword.match_type`         VARCHAR(20)     NULL,
    `metrics.impressions`                           BIGINT          NULL,
    `metrics.clicks`                                BIGINT          NULL,
    `metrics.cost_micros`                           BIGINT          NULL COMMENT '÷1.000.000 = TL',
    `metrics.ctr`                                   DOUBLE          NULL,
    `metrics.average_cpc`                           DOUBLE          NULL COMMENT 'Mikro birim — ÷1.000.000 = TL',
    `metrics.average_cpm`                           DOUBLE          NULL COMMENT 'Mikro birim',
    `metrics.conversions`                           DOUBLE          NULL,
    `metrics.conversions_value`                     DOUBLE          NULL,
    `metrics.all_conversions`                       DOUBLE          NULL,
    `metrics.all_conversions_value`                 DOUBLE          NULL,
    `metrics.cost_per_conversion`                   DOUBLE          NULL COMMENT 'Mikro birim',
    `metrics.conversions_from_interactions_rate`    DOUBLE          NULL,
    `metrics.value_per_conversion`                  DOUBLE          NULL,
    `metrics.search_impression_share`               DOUBLE          NULL,
    `metrics.search_budget_lost_impression_share`   DOUBLE          NULL,
    `metrics.search_rank_lost_impression_share`     DOUBLE          NULL,
    `metrics.view_through_conversions`              BIGINT          NULL,
    `metrics.interaction_rate`                      DOUBLE          NULL,

    CONSTRAINT fk_raw_google_ads_import
        FOREIGN KEY (import_id) REFERENCES imports(id)
);

-- ============================================================
-- GRUP 5: CLEAN ANALİTİK TABLOLAR
-- Dönüşümler uygulanmış, snake_case sütun adları
-- Her tabloda raw_id FK → ilgili raw tabloya
-- ============================================================

-- ------------------------------------------------------------
-- ga4_traffic
-- GA4 oturum ve trafik verisi — temizlenmiş
-- PK: id (surrogate — composite PK çok uzun olurdu)
-- FK: raw_id → raw_ga4_traffic.id (hard)
--     session_campaign_name → campaigns.campaign_name (SOFT — (not set) gelebilir)
--     session_source + session_medium → channel_mapping (SOFT)
-- KRİTİK: Bu tablo satış attribution için referans alınır (toplantı kararı)
--         ga4_item_interactions ile AYNI SORGUDA JOIN YAPILAMAZ (GA4 kısıtı)
-- ------------------------------------------------------------
CREATE TABLE ga4_traffic (
    id                          INT             AUTO_INCREMENT PRIMARY KEY,
    raw_id                      INT             NOT NULL,
    date                        DATE            NOT NULL COMMENT 'YYYYMMDD int → DATE dönüşümü yapıldı',
    session_source              VARCHAR(100)    NOT NULL,
    session_medium              VARCHAR(100)    NOT NULL,
    session_campaign_name       VARCHAR(255)    NULL     COMMENT 'Soft ref → campaigns. (not set),(organic),(direct) gelebilir',
    session_default_channel_group VARCHAR(100)  NOT NULL,
    device_category             VARCHAR(20)     NOT NULL COMMENT 'mobile, desktop, tablet',
    city                        VARCHAR(100)    NOT NULL,
    landing_page                VARCHAR(1000)   NULL     COMMENT 'URL path kısmı — query string dahil',
    new_vs_returning            VARCHAR(20)     NOT NULL COMMENT 'new, returning',
    sessions                    INT             NOT NULL DEFAULT 0,
    total_users                 INT             NOT NULL DEFAULT 0,
    new_users                   INT             NOT NULL DEFAULT 0,
    bounce_rate                 DECIMAL(5,4)    NOT NULL DEFAULT 0.0000 COMMENT '0-1 arası (0.45 = %45)',
    avg_session_duration        DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT 'Saniye cinsinden',
    pages_per_session           DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
    engaged_sessions            INT             NOT NULL DEFAULT 0,
    engagement_rate             DECIMAL(5,4)    NOT NULL DEFAULT 0.0000 COMMENT '0-1 arası',
    user_engagement_duration    DECIMAL(15,2)   NOT NULL DEFAULT 0.00,
    conversions                 INT             NOT NULL DEFAULT 0,
    purchase_revenue            DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    transactions                INT             NOT NULL DEFAULT 0,

    CONSTRAINT fk_ga4_traffic_raw
        FOREIGN KEY (raw_id) REFERENCES raw_ga4_traffic(id)
);

-- ------------------------------------------------------------
-- ga4_item_interactions
-- GA4 ürün bazlı event verisi — temizlenmiş
-- PK: id (surrogate)
-- FK: raw_id → raw_ga4_item_interactions.id (hard)
--     item_id → products.sku (hard)
-- KRİTİK: ga4_traffic ile AYNI SORGUDA JOIN YAPILAMAZ (GA4 API kısıtı)
--         item_id = products.sku = order_items.item_id = google_ads.product_item_id
-- ------------------------------------------------------------
CREATE TABLE ga4_item_interactions (
    id                  INT             AUTO_INCREMENT PRIMARY KEY,
    raw_id              INT             NOT NULL,
    date                DATE            NOT NULL,
    item_id             VARCHAR(50)     NOT NULL,
    item_name           VARCHAR(500)    NOT NULL,
    item_category       VARCHAR(100)    NOT NULL,
    item_category2      VARCHAR(100)    NOT NULL,
    item_brand          VARCHAR(100)    NOT NULL,
    items_viewed        INT             NOT NULL DEFAULT 0,
    items_added_to_cart INT             NOT NULL DEFAULT 0,
    items_checked_out   INT             NOT NULL DEFAULT 0,
    items_purchased     INT             NOT NULL DEFAULT 0,
    item_revenue        DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    item_list_views     INT             NOT NULL DEFAULT 0,
    item_list_clicks    INT             NOT NULL DEFAULT 0,
    cart_to_view_rate   DECIMAL(5,4)    NOT NULL DEFAULT 0.0000 COMMENT '0-1 arası',

    CONSTRAINT fk_ga4_items_raw
        FOREIGN KEY (raw_id) REFERENCES raw_ga4_item_interactions(id),
    CONSTRAINT fk_ga4_items_product
        FOREIGN KEY (item_id) REFERENCES products(sku)
);

-- ------------------------------------------------------------
-- meta_ads
-- Meta reklam performansı — temizlenmiş
-- PK: id (surrogate)
-- FK: raw_id → raw_meta_ads.id (hard)
--     campaign_name → campaigns.campaign_name (hard — %100 eşleşme doğrulandı)
-- KRİTİK: ctr /100 yapıldı (2.25 → 0.0225)
--         ROAS hesabında pixel_purchase_value KULLANILMAZ
--         Gerçek gelir orders tablosundan okunur (toplantı kararı)
-- ------------------------------------------------------------
CREATE TABLE meta_ads (
    id                          INT             AUTO_INCREMENT PRIMARY KEY,
    raw_id                      INT             NOT NULL,
    date                        DATE            NOT NULL,
    account_id                  VARCHAR(50)     NOT NULL,
    account_name                VARCHAR(255)    NOT NULL,
    campaign_id                 VARCHAR(50)     NOT NULL,
    campaign_name               VARCHAR(255)    NOT NULL,
    adset_id                    VARCHAR(50)     NOT NULL,
    adset_name                  VARCHAR(255)    NOT NULL,
    ad_id                       VARCHAR(50)     NOT NULL,
    ad_name                     VARCHAR(255)    NOT NULL,
    objective                   VARCHAR(100)    NOT NULL,
    buying_type                 VARCHAR(50)     NOT NULL,
    impressions                 INT             NOT NULL DEFAULT 0,
    reach                       INT             NOT NULL DEFAULT 0,
    frequency                   DECIMAL(5,2)    NOT NULL DEFAULT 0.00 COMMENT 'impressions / reach',
    clicks                      INT             NOT NULL DEFAULT 0,
    inline_link_clicks          INT             NOT NULL DEFAULT 0,
    spend                       DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    cpc                         DECIMAL(10,4)   NOT NULL DEFAULT 0.0000,
    cpm                         DECIMAL(10,4)   NOT NULL DEFAULT 0.0000,
    cpp                         DECIMAL(10,4)   NOT NULL DEFAULT 0.0000,
    ctr                         DECIMAL(5,4)    NOT NULL DEFAULT 0.0000 COMMENT '÷100 yapıldı — 0-1 arası (GA4 ile uyumlu)',
    inline_link_click_ctr       DECIMAL(5,4)    NOT NULL DEFAULT 0.0000,
    action_link_click           INT             NOT NULL DEFAULT 0,
    action_landing_page_view    INT             NOT NULL DEFAULT 0,
    pixel_view_content          INT             NOT NULL DEFAULT 0,
    pixel_add_to_cart           INT             NOT NULL DEFAULT 0,
    pixel_initiate_checkout     INT             NOT NULL DEFAULT 0,
    pixel_purchase              INT             NOT NULL DEFAULT 0,
    pixel_purchase_value        DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT 'ROAS için KULLANILMAZ — gelir orders tablosundan',
    action_page_engagement      INT             NOT NULL DEFAULT 0,
    action_post_engagement      INT             NOT NULL DEFAULT 0,
    action_video_view           INT             NOT NULL DEFAULT 0,

    CONSTRAINT fk_meta_ads_raw
        FOREIGN KEY (raw_id) REFERENCES raw_meta_ads(id),
    CONSTRAINT fk_meta_ads_campaign
        FOREIGN KEY (campaign_name) REFERENCES campaigns(campaign_name)
);

-- ------------------------------------------------------------
-- meta_ads_breakdowns
-- Meta placement + device kırılım verisi — temizlenmiş
-- PK: id (surrogate)
-- FK: raw_id → raw_meta_ads_breakdowns.id (hard)
--     campaign_name → campaigns.campaign_name (hard)
-- NOT: meta_ads ile doğrudan FK yok — ikisi de campaigns'e bağlı
--      Age/gender ve geo breakdown'ları ayrı tablolar olarak ileride eklenecek
-- ------------------------------------------------------------
CREATE TABLE meta_ads_breakdowns (
    id                  INT             AUTO_INCREMENT PRIMARY KEY,
    raw_id              INT             NOT NULL,
    date                DATE            NOT NULL,
    campaign_name       VARCHAR(255)    NOT NULL,
    adset_name          VARCHAR(255)    NOT NULL,
    ad_name             VARCHAR(255)    NOT NULL,
    publisher_platform  VARCHAR(50)     NOT NULL COMMENT 'facebook, instagram',
    platform_position   VARCHAR(100)    NOT NULL COMMENT 'feed, story, reels, right_hand_column, marketplace, ig_explore',
    impression_device   VARCHAR(50)     NOT NULL COMMENT 'mobile_web, desktop, mobile_app',
    impressions         INT             NOT NULL DEFAULT 0,
    clicks              INT             NOT NULL DEFAULT 0,
    spend               DECIMAL(10,2)   NOT NULL DEFAULT 0.00,

    CONSTRAINT fk_meta_bd_raw
        FOREIGN KEY (raw_id) REFERENCES raw_meta_ads_breakdowns(id),
    CONSTRAINT fk_meta_bd_campaign
        FOREIGN KEY (campaign_name) REFERENCES campaigns(campaign_name)
);

-- ------------------------------------------------------------
-- google_ads
-- Google Ads performans verisi — temizlenmiş
-- PK: id (surrogate)
-- FK: raw_id → raw_google_ads.id (hard)
--     campaign_name → campaigns.campaign_name (hard)
--     product_item_id → products.sku (NULLABLE — sadece Shopping/PMax)
-- KRİTİK: cost_tl = cost_micros / 1.000.000
--         product_item_id Search kampanyalarında NULL — LEFT JOIN kullan
--         keyword_text Shopping/PMax'ta NULL — LEFT JOIN kullan
-- ------------------------------------------------------------
CREATE TABLE google_ads (
    id                          INT             AUTO_INCREMENT PRIMARY KEY,
    raw_id                      INT             NOT NULL,
    date                        DATE            NOT NULL,
    customer_id                 VARCHAR(50)     NOT NULL,
    customer_name               VARCHAR(255)    NOT NULL,
    campaign_id                 VARCHAR(50)     NOT NULL,
    campaign_name               VARCHAR(255)    NOT NULL,
    campaign_status             VARCHAR(20)     NOT NULL COMMENT 'ENABLED, PAUSED, REMOVED',
    channel_type                VARCHAR(50)     NOT NULL COMMENT 'SEARCH, SHOPPING, PERFORMANCE_MAX, DISPLAY, VIDEO',
    ad_group_id                 VARCHAR(50)     NOT NULL,
    ad_group_name               VARCHAR(255)    NOT NULL,
    ad_group_status             VARCHAR(20)     NOT NULL,
    device                      VARCHAR(20)     NOT NULL COMMENT 'MOBILE, DESKTOP, TABLET, OTHER',
    ad_network_type             VARCHAR(50)     NOT NULL,
    product_item_id             VARCHAR(50)     NULL     COMMENT 'Nullable — sadece Shopping/PMax dolu',
    product_title               VARCHAR(500)    NULL,
    product_brand               VARCHAR(100)    NULL,
    product_type_l1             VARCHAR(100)    NULL,
    product_type_l2             VARCHAR(100)    NULL,
    keyword_text                VARCHAR(255)    NULL     COMMENT 'Nullable — sadece Search dolu',
    keyword_match_type          VARCHAR(20)     NULL     COMMENT 'EXACT, PHRASE, BROAD',
    impressions                 INT             NOT NULL DEFAULT 0,
    clicks                      INT             NOT NULL DEFAULT 0,
    cost_tl                     DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT 'cost_micros / 1.000.000',
    ctr                         DECIMAL(5,4)    NOT NULL DEFAULT 0.0000 COMMENT '0-1 arası (GA4 ile aynı format)',
    avg_cpc_tl                  DECIMAL(10,4)   NOT NULL DEFAULT 0.0000 COMMENT 'average_cpc / 1.000.000',
    avg_cpm_tl                  DECIMAL(10,4)   NOT NULL DEFAULT 0.0000,
    conversions                 DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT 'Float olarak gelir',
    conversions_value           DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    all_conversions             DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    all_conversions_value       DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    cost_per_conversion_tl      DECIMAL(10,4)   NOT NULL DEFAULT 0.0000,
    conversion_rate             DECIMAL(5,4)    NOT NULL DEFAULT 0.0000 COMMENT '0-1 arası',
    value_per_conversion        DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    search_impression_share     DECIMAL(5,4)    NULL     COMMENT '0-1 arası, null olabilir',
    search_budget_lost_is       DECIMAL(5,4)    NULL,
    search_rank_lost_is         DECIMAL(5,4)    NULL,
    view_through_conversions    INT             NOT NULL DEFAULT 0,
    interaction_rate            DECIMAL(5,4)    NOT NULL DEFAULT 0.0000,

    CONSTRAINT fk_google_ads_raw
        FOREIGN KEY (raw_id) REFERENCES raw_google_ads(id),
    CONSTRAINT fk_google_ads_campaign
        FOREIGN KEY (campaign_name) REFERENCES campaigns(campaign_name),
    CONSTRAINT fk_google_ads_product
        FOREIGN KEY (product_item_id) REFERENCES products(sku)
);

-- ============================================================
-- GRUP 6: GÜVENLİK VE SİSTEM TABLOLARI
-- ============================================================

-- ------------------------------------------------------------
-- audit_logs
-- Kritik sistem işlemlerinin kaydı
-- PK: id (surrogate)
-- FK: user_id → users.id (hard)
-- NOT: table_name ve record_id string — tüm tablolara FK vermek imkansız
-- ------------------------------------------------------------
CREATE TABLE audit_logs (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    user_id         INT             NOT NULL,
    action          VARCHAR(100)    NOT NULL COMMENT 'import_start, import_commit, kpi_run, view_save, segment_create vb.',
    table_name      VARCHAR(100)    NULL     COMMENT 'İşlem yapılan tablo adı',
    record_id       VARCHAR(100)    NULL     COMMENT 'İşlem yapılan kayıt ID',
    old_value       JSON            NULL     COMMENT 'Güncelleme öncesi değer',
    new_value       JSON            NULL     COMMENT 'Güncelleme sonrası değer',
    ip_address      VARCHAR(45)     NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_audit_logs_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------
-- api_logs
-- API hataları ve yetkisiz erişim denemeleri
-- PK: id (surrogate)
-- FK: user_id → users.id (NULLABLE — yetkisiz erişimde kullanıcı bilinmez)
-- ------------------------------------------------------------
CREATE TABLE api_logs (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    user_id         INT             NULL     COMMENT 'Nullable — yetkisiz erişimde NULL',
    method          VARCHAR(10)     NOT NULL COMMENT 'GET, POST, PUT, DELETE',
    endpoint        VARCHAR(500)    NOT NULL,
    status_code     INT             NOT NULL,
    request_body    JSON            NULL,
    response_time   INT             NULL     COMMENT 'Milisaniye',
    ip_address      VARCHAR(45)     NULL,
    error_message   TEXT            NULL,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_api_logs_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------
-- refresh_logs
-- KPI ve aggregation tablolarının hesaplama geçmişi
-- PK: id (surrogate)
-- FK: triggered_by → users.id (NULLABLE — sistem otomatik tetikleyebilir)
-- BAĞLANAN: kpi_* ve agg_* tabloları
-- ------------------------------------------------------------
CREATE TABLE refresh_logs (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    triggered_by    INT             NULL     COMMENT 'Nullable — otomatik tetiklemede NULL',
    table_name      VARCHAR(100)    NOT NULL COMMENT 'kpi_daily_traffic, agg_campaign_performance vb.',
    status          VARCHAR(20)     NOT NULL DEFAULT 'running' COMMENT 'running, completed, failed',
    rows_affected   INT             NULL,
    duration_ms     INT             NULL     COMMENT 'Hesaplama süresi milisaniye',
    error_message   TEXT            NULL,
    started_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at    DATETIME        NULL,

    CONSTRAINT fk_refresh_logs_user
        FOREIGN KEY (triggered_by) REFERENCES users(id)
);

-- ------------------------------------------------------------
-- saved_views
-- Kullanıcının kaydettiği dashboard layout ve filtre kombinasyonları
-- PK: id (surrogate)
-- FK: user_id → users.id (hard)
-- ------------------------------------------------------------
CREATE TABLE saved_views (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    user_id         INT             NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    description     VARCHAR(500)    NULL,
    layout          JSON            NOT NULL COMMENT 'Widget konumları ve boyutları',
    filters         JSON            NULL     COMMENT 'Kayıtlı filtre kombinasyonu',
    is_default      TINYINT(1)      NOT NULL DEFAULT 0,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_saved_views_user
        FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ------------------------------------------------------------
-- segments
-- Kullanıcı tanımlı segmentler
-- PK: id (surrogate)
-- FK: created_by → users.id (hard)
-- NOT: rules JSON olarak saklanır — ayrı segment_rules tablosu yok
-- ------------------------------------------------------------
CREATE TABLE segments (
    id              INT             AUTO_INCREMENT PRIMARY KEY,
    created_by      INT             NOT NULL,
    name            VARCHAR(255)    NOT NULL,
    description     VARCHAR(500)    NULL,
    rules           JSON            NOT NULL COMMENT '{"channel":"Paid Social","device":"mobile","city":"Istanbul"}',
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_segments_user
        FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================================
-- GRUP 7: KPI TABLOLARI (PRE-COMPUTED)
-- Import sonrası otomatik hesaplanır
-- Her tabloda refresh_log_id → refresh_logs.id
-- ============================================================

-- ------------------------------------------------------------
-- kpi_daily_traffic
-- Günlük trafik KPI'ları — ga4_traffic'ten hesaplanır
-- PK: date + channel_group (composite)
-- ------------------------------------------------------------
CREATE TABLE kpi_daily_traffic (
    date                    DATE            NOT NULL,
    channel_group           VARCHAR(100)    NOT NULL,
    refresh_log_id          INT             NOT NULL,
    sessions                INT             NOT NULL DEFAULT 0,
    total_users             INT             NOT NULL DEFAULT 0,
    new_users               INT             NOT NULL DEFAULT 0,
    bounce_rate             DECIMAL(5,4)    NOT NULL DEFAULT 0.0000 COMMENT 'KRİTİK: SUM(bounce_rate*sessions)/SUM(sessions) — basit AVG YANLIŞ',
    avg_session_duration    DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    pages_per_session       DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
    engaged_sessions        INT             NOT NULL DEFAULT 0,
    engagement_rate         DECIMAL(5,4)    NOT NULL DEFAULT 0.0000 COMMENT 'KRİTİK: SUM(engagement_rate*sessions)/SUM(sessions) — basit AVG YANLIŞ',
    conversions             INT             NOT NULL DEFAULT 0,
    purchase_revenue        DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    transactions            INT             NOT NULL DEFAULT 0,
    revenue_per_user        DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT 'purchase_revenue / total_users',
    traffic_growth_rate     DECIMAL(7,4)    NULL     COMMENT 'Önceki günle karşılaştırma — ilk gün NULL',

    PRIMARY KEY (date, channel_group),

    CONSTRAINT fk_kpi_traffic_refresh
        FOREIGN KEY (refresh_log_id) REFERENCES refresh_logs(id)
);

-- ------------------------------------------------------------
-- kpi_daily_ads
-- Günlük reklam KPI'ları — meta_ads + google_ads'ten hesaplanır
-- PK: date + platform + campaign_name (composite)
-- KRİTİK: roas = orders.net_revenue / spend
--         pixel_purchase_value ve conversions_value KULLANILMAZ
--         Gerçek gelir orders tablosundan campaign_name join ile gelir
-- ------------------------------------------------------------
CREATE TABLE kpi_daily_ads (
    date                    DATE            NOT NULL,
    platform                VARCHAR(20)     NOT NULL COMMENT 'meta, google, total',
    campaign_name           VARCHAR(255)    NOT NULL,
    refresh_log_id          INT             NOT NULL,
    impressions             INT             NOT NULL DEFAULT 0,
    clicks                  INT             NOT NULL DEFAULT 0,
    spend                   DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    ctr                     DECIMAL(5,4)    NOT NULL DEFAULT 0.0000,
    cpc                     DECIMAL(10,4)   NOT NULL DEFAULT 0.0000,
    cpm                     DECIMAL(10,4)   NOT NULL DEFAULT 0.0000,
    conversions             DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    revenue                 DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT 'orders tablosundan — platformun kendi değeri değil',
    roas                    DECIMAL(10,4)   NOT NULL DEFAULT 0.0000 COMMENT 'revenue / spend',
    cost_per_conversion     DECIMAL(10,4)   NOT NULL DEFAULT 0.0000,
    frequency               DECIMAL(5,2)    NULL     COMMENT 'Sadece Meta — Google NULL',
    spend_growth_rate       DECIMAL(7,4)    NULL     COMMENT 'Önceki günle harcama değişimi — ilk gün NULL',
    roas_growth_rate        DECIMAL(7,4)    NULL     COMMENT 'Önceki günle ROAS değişimi — ilk gün NULL',

    PRIMARY KEY (date, platform, campaign_name),

    CONSTRAINT fk_kpi_ads_refresh
        FOREIGN KEY (refresh_log_id) REFERENCES refresh_logs(id)
);

-- ------------------------------------------------------------
-- kpi_daily_sales
-- Günlük satış KPI'ları — orders + order_items'tan hesaplanır
-- PK: date (günde bir satır)
-- ------------------------------------------------------------
CREATE TABLE kpi_daily_sales (
    date                        DATE            NOT NULL PRIMARY KEY,
    refresh_log_id              INT             NOT NULL,
    total_orders                INT             NOT NULL DEFAULT 0,
    total_revenue               DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    net_revenue                 DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    total_items_sold            INT             NOT NULL DEFAULT 0,
    avg_order_value             DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT 'net_revenue / total_orders',
    refund_rate                 DECIMAL(5,4)    NOT NULL DEFAULT 0.0000 COMMENT 'refund_amount / order_revenue',
    discount_rate               DECIMAL(5,4)    NOT NULL DEFAULT 0.0000,
    repeat_purchase_rate        DECIMAL(5,4)    NOT NULL DEFAULT 0.0000 COMMENT 'Birden fazla sipariş veren / toplam müşteri',
    new_customer_revenue        DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT 'first_order_date bu günde olan müşterilerin geliri',
    returning_customer_revenue  DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT 'first_order_date bu günden önce olan müşterilerin geliri',
    revenue_growth_rate         DECIMAL(7,4)    NULL     COMMENT 'Önceki günle karşılaştırma — ilk gün NULL',

    CONSTRAINT fk_kpi_sales_refresh
        FOREIGN KEY (refresh_log_id) REFERENCES refresh_logs(id)
);

-- ============================================================
-- GRUP 8: AGGREGATION TABLOLARI
-- Kompleks join'ler önceden hesaplanmış
-- ============================================================

-- ------------------------------------------------------------
-- agg_channel_performance
-- Kanal bazlı birleşik performans
-- Kaynak: orders + ga4_traffic + meta_ads + google_ads
-- PK: date + channel_group (composite)
-- KRİTİK: revenue orders'tan, sessions ga4_traffic'ten
--         Satış attribution GA4 üzerinden (toplantı kararı)
-- ------------------------------------------------------------
CREATE TABLE agg_channel_performance (
    date                    DATE            NOT NULL,
    channel_group           VARCHAR(100)    NOT NULL,
    refresh_log_id          INT             NOT NULL,
    sessions                INT             NOT NULL DEFAULT 0,
    total_users             INT             NOT NULL DEFAULT 0,
    orders                  INT             NOT NULL DEFAULT 0,
    revenue                 DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    net_revenue             DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    spend                   DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    roas                    DECIMAL(10,4)   NULL     COMMENT 'NULL — organic kanalda harcama yok',
    conversion_rate         DECIMAL(5,4)    NOT NULL DEFAULT 0.0000 COMMENT 'orders / sessions',
    avg_order_value         DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    revenue_per_user        DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT 'net_revenue / total_users — PDF KPI gereksinimi',
    bounce_rate             DECIMAL(5,4)    NOT NULL DEFAULT 0.0000 COMMENT 'KRİTİK: weighted avg — SUM(bounce_rate*sessions)/SUM(sessions)',

    PRIMARY KEY (date, channel_group),

    CONSTRAINT fk_agg_channel_refresh
        FOREIGN KEY (refresh_log_id) REFERENCES refresh_logs(id)
);

-- ------------------------------------------------------------
-- agg_campaign_performance
-- Kampanya bazlı birleşik performans
-- Kaynak: campaigns + meta_ads + google_ads + orders
-- PK: date + campaign_name + platform (composite)
-- ------------------------------------------------------------
CREATE TABLE agg_campaign_performance (
    date                    DATE            NOT NULL,
    campaign_name           VARCHAR(255)    NOT NULL,
    platform                VARCHAR(20)     NOT NULL COMMENT 'meta, google',
    refresh_log_id          INT             NOT NULL,
    impressions             INT             NOT NULL DEFAULT 0,
    clicks                  INT             NOT NULL DEFAULT 0,
    spend                   DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    revenue                 DECIMAL(10,2)   NOT NULL DEFAULT 0.00 COMMENT 'orders tablosundan',
    roas                    DECIMAL(10,4)   NOT NULL DEFAULT 0.0000,
    conversions             DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    ctr                     DECIMAL(5,4)    NOT NULL DEFAULT 0.0000,
    cpc                     DECIMAL(10,4)   NOT NULL DEFAULT 0.0000,
    avg_order_value         DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    cost_per_conversion     DECIMAL(10,4)   NOT NULL DEFAULT 0.0000,

    PRIMARY KEY (date, campaign_name, platform),

    CONSTRAINT fk_agg_campaign_campaign
        FOREIGN KEY (campaign_name) REFERENCES campaigns(campaign_name),
    CONSTRAINT fk_agg_campaign_refresh
        FOREIGN KEY (refresh_log_id) REFERENCES refresh_logs(id)
);

-- ------------------------------------------------------------
-- agg_product_performance
-- Ürün bazlı satış ve huni analizi
-- Kaynak: order_items + ga4_item_interactions + products
-- PK: date + item_id (composite)
-- ------------------------------------------------------------
CREATE TABLE agg_product_performance (
    date                    DATE            NOT NULL,
    item_id                 VARCHAR(50)     NOT NULL,
    refresh_log_id          INT             NOT NULL,
    product_name            VARCHAR(500)    NOT NULL,
    category                VARCHAR(100)    NOT NULL,
    brand                   VARCHAR(100)    NOT NULL,
    item_list_views         INT             NOT NULL DEFAULT 0,
    item_list_clicks        INT             NOT NULL DEFAULT 0,
    items_viewed            INT             NOT NULL DEFAULT 0,
    items_added_to_cart     INT             NOT NULL DEFAULT 0,
    items_purchased         INT             NOT NULL DEFAULT 0,
    orders_count            INT             NOT NULL DEFAULT 0,
    revenue                 DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    cart_to_view_rate       DECIMAL(5,4)    NOT NULL DEFAULT 0.0000,
    purchase_rate           DECIMAL(5,4)    NOT NULL DEFAULT 0.0000 COMMENT 'items_purchased / items_viewed',

    PRIMARY KEY (date, item_id),

    CONSTRAINT fk_agg_product_product
        FOREIGN KEY (item_id) REFERENCES products(sku),
    CONSTRAINT fk_agg_product_refresh
        FOREIGN KEY (refresh_log_id) REFERENCES refresh_logs(id)
);

-- ------------------------------------------------------------
-- agg_cohort_retention
-- Cohort ve retention analizi — ay bazlı
-- Kaynak: customers + orders
-- PK: cohort_month + offset_month (composite)
-- YAPI: cohort_month=2024-10, offset=1 →
--       Ekim'de ilk kez alan müşterilerin Kasım'daki aktivitesi
-- ------------------------------------------------------------
CREATE TABLE agg_cohort_retention (
    cohort_month            VARCHAR(7)      NOT NULL COMMENT 'YYYY-MM formatı (2024-10)',
    offset_month            INT             NOT NULL COMMENT '0=ilk ay, 1=bir sonraki ay vb.',
    refresh_log_id          INT             NOT NULL,
    total_customers         INT             NOT NULL DEFAULT 0 COMMENT 'O cohort taki toplam müşteri',
    active_customers        INT             NOT NULL DEFAULT 0 COMMENT 'O offsette sipariş veren müşteri',
    retention_rate          DECIMAL(5,4)    NOT NULL DEFAULT 0.0000 COMMENT 'active / total',
    revenue                 DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    avg_order_value         DECIMAL(10,2)   NOT NULL DEFAULT 0.00,

    PRIMARY KEY (cohort_month, offset_month),

    CONSTRAINT fk_agg_cohort_refresh
        FOREIGN KEY (refresh_log_id) REFERENCES refresh_logs(id)
);

-- ============================================================
-- UNIQUE INDEXLER — DUPLICATE KAYIT KONTROLÜ
-- Import sırasında aynı verinin iki kez yüklenmesini engeller
-- duplicateChecker.js bu indexleri kullanarak kontrol yapar
-- ============================================================

-- ga4_traffic: aynı tarih+kaynak+cihaz+şehir kombinasyonu bir kez olabilir
CREATE UNIQUE INDEX uq_ga4_traffic
    ON ga4_traffic(date, session_source, session_medium,
                   session_campaign_name(100), device_category,
                   city, new_vs_returning, landing_page(100));

-- ga4_item_interactions: aynı tarih+ürün bir kez olabilir
CREATE UNIQUE INDEX uq_ga4_items
    ON ga4_item_interactions(date, item_id);

-- meta_ads_breakdowns: aynı tarih+kampanya+platform+yerleşim+cihaz bir kez
CREATE UNIQUE INDEX uq_meta_bd
    ON meta_ads_breakdowns(date, campaign_name(100), adset_name(100),
                           ad_name(100), publisher_platform,
                           platform_position, impression_device);

-- google_ads: aynı tarih+kampanya+adgroup+cihaz+ağ kombinasyonu bir kez
-- product_item_id ve keyword NULL olabilir, UNIQUE index NULL'ları hariç tutar
CREATE UNIQUE INDEX uq_google_ads
    ON google_ads(date, campaign_id, ad_group_id,
                  device, ad_network_type);

-- ============================================================
-- INDEXLER
-- Dashboard filtreleme performansı için (PDF gereksinimi)
-- ============================================================

-- Tarih bazlı sorgular
CREATE INDEX idx_ga4_traffic_date         ON ga4_traffic(date);
CREATE INDEX idx_ga4_items_date           ON ga4_item_interactions(date);
CREATE INDEX idx_meta_ads_date            ON meta_ads(date);
CREATE INDEX idx_meta_bd_date             ON meta_ads_breakdowns(date);
CREATE INDEX idx_google_ads_date          ON google_ads(date);
CREATE INDEX idx_orders_date              ON orders(order_date);

-- Kampanya bazlı sorgular
CREATE INDEX idx_meta_ads_campaign        ON meta_ads(campaign_name);
CREATE INDEX idx_google_ads_campaign      ON google_ads(campaign_name);
CREATE INDEX idx_orders_campaign          ON orders(campaign_name);
CREATE INDEX idx_meta_bd_campaign         ON meta_ads_breakdowns(campaign_name);

-- Kanal bazlı sorgular
CREATE INDEX idx_orders_channel           ON orders(channel);
CREATE INDEX idx_orders_source_medium     ON orders(source, medium);
CREATE INDEX idx_ga4_traffic_channel      ON ga4_traffic(session_default_channel_group);
CREATE INDEX idx_ga4_traffic_source       ON ga4_traffic(session_source, session_medium);

-- Ürün bazlı sorgular
CREATE INDEX idx_ga4_items_item_id        ON ga4_item_interactions(item_id);
CREATE INDEX idx_google_ads_product       ON google_ads(product_item_id);
CREATE INDEX idx_order_items_item_id      ON order_items(item_id);

-- Müşteri bazlı sorgular
CREATE INDEX idx_orders_customer          ON orders(customer_id);

-- Import ve sistem sorguları
CREATE INDEX idx_imports_status           ON imports(status);
CREATE INDEX idx_imports_source_table     ON imports(source_table);
CREATE INDEX idx_audit_logs_user          ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created       ON audit_logs(created_at);
CREATE INDEX idx_api_logs_status          ON api_logs(status_code);
CREATE INDEX idx_refresh_logs_table       ON refresh_logs(table_name);

-- ============================================================
-- PARTITION STRATEJİSİ
-- PDF gereksinimi: "Tarih bazlı partition önerilir"
-- Aşağıdaki tablolar gerçek veriye geçişte partition edilmeli
-- Dummy veri için şimdilik uygulanmıyor — veri hacmi küçük
-- Gerçek sistemde aşağıdaki ALTER TABLE komutları çalıştırılmalı:
--
-- ALTER TABLE ga4_traffic
--   PARTITION BY RANGE (YEAR(date)) (
--     PARTITION p2024 VALUES LESS THAN (2025),
--     PARTITION p2025 VALUES LESS THAN (2026),
--     PARTITION p_future VALUES LESS THAN MAXVALUE
--   );
--
-- Aynı yapı şu tablolara da uygulanmalı:
--   ga4_item_interactions  → YEAR(date)
--   meta_ads               → YEAR(date)
--   meta_ads_breakdowns    → YEAR(date)
--   google_ads             → YEAR(date)
--   orders                 → YEAR(order_date)
--   raw_ga4_traffic        → (import_id aralığı ile)
--   raw_meta_ads           → (import_id aralığı ile)
--   raw_google_ads         → (import_id aralığı ile)
--
-- KRİTİK: Partition key INDEX'te de olmalı — MySQL zorunluluğu
-- KRİTİK: PARTITION BY olan tablolarda FOREIGN KEY KULLANILAMAZ
--   Bu yüzden partition gerçek sisteme geçişte FK kaldırılıp
--   uygulama katmanında kontrol edilmeli
-- ============================================================

-- ============================================================
-- SCHEMA TAMAMLANDI
-- Toplam: 32 tablo, 6 grup
-- ============================================================
