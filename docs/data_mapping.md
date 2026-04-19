# docs/data_mapping.md — CSV Import ve Dönüşüm Kuralları

## Import Akışı

```
CSV/XLSX/JSON yükle
    ↓
raw tabloya yaz (ham hali)
    ↓
transformer.js — değer dönüşümleri
    ↓
mapper.js — sütun adı eşleme (config'den okur)
    ↓
validator.js — tip + zorunlu alan kontrolü
    ↓
duplicateChecker.js — tarih aralığı daha önce yüklendi mi?
    ↓
clean tabloya yaz
    ↓
KPI hesaplamayı tetikle
```

Hatalı satır → `import_errors` tablosuna yaz, devam et.
Rollback: DB yazma sırasında kritik hata → tüm işlemi geri al.

---

## Kaynak 1: ga4_traffic.csv → ga4_traffic

**Dönüşümler (transformer.js):**
```
date: 20241001 (int) → 2024-10-01 (DATE)
camelCase → snake_case (tüm sütunlar)
```

**Sütun Eşleme (mapper.js / config/ga4TrafficMapping.js):**

| CSV Sütunu | DB Sütunu | Tip |
|---|---|---|
| date | date | DATE (dönüşüm gerekli) |
| sessionSource | session_source | VARCHAR |
| sessionMedium | session_medium | VARCHAR |
| sessionCampaignName | session_campaign_name | VARCHAR |
| sessionDefaultChannelGroup | session_default_channel_group | VARCHAR |
| deviceCategory | device_category | VARCHAR |
| city | city | VARCHAR |
| landingPagePlusQueryString | landing_page | VARCHAR(1000) |
| newVsReturning | new_vs_returning | VARCHAR |
| sessions | sessions | INT |
| totalUsers | total_users | INT |
| newUsers | new_users | INT |
| bounceRate | bounce_rate | DECIMAL(5,4) |
| averageSessionDuration | avg_session_duration | DECIMAL(10,2) |
| screenPageViewsPerSession | pages_per_session | DECIMAL(5,2) |
| engagedSessions | engaged_sessions | INT |
| engagementRate | engagement_rate | DECIMAL(5,4) |
| userEngagementDuration | user_engagement_duration | DECIMAL(15,2) |
| conversions | conversions | INT |
| purchaseRevenue | purchase_revenue | DECIMAL(10,2) |
| transactions | transactions | INT |

**Zorunlu alanlar:** date, session_source, session_medium, sessions

---

## Kaynak 2: ga4_item_interactions.csv → ga4_item_interactions

**Dönüşümler:**
```
date: 20241001 (int) → 2024-10-01 (DATE)
camelCase → snake_case
```

**Sütun Eşleme (config/ga4ItemsMapping.js):**

| CSV Sütunu | DB Sütunu | Tip |
|---|---|---|
| date | date | DATE |
| itemId | item_id | VARCHAR |
| itemName | item_name | VARCHAR |
| itemCategory | item_category | VARCHAR |
| itemCategory2 | item_category2 | VARCHAR |
| itemBrand | item_brand | VARCHAR |
| itemsViewed | items_viewed | INT |
| itemsAddedToCart | items_added_to_cart | INT |
| itemsCheckedOut | items_checked_out | INT |
| itemsPurchased | items_purchased | INT |
| itemRevenue | item_revenue | DECIMAL(10,2) |
| itemListViews | item_list_views | INT |
| itemListClicks | item_list_clicks | INT |
| cartToViewRate | cart_to_view_rate | DECIMAL(5,4) |

**Zorunlu alanlar:** date, item_id
**FK kontrolü:** item_id → products.sku (eşleşme yoksa import_errors)

---

## Kaynak 3: meta_ads.csv → meta_ads

**Dönüşümler (transformer.js):**
```
ctr: 2.25 → 0.0225 (÷100) — GA4 ve Google ile uyumlu format
inline_link_click_ctr: aynı şekilde ÷100
action: prefix temizleme → sütun adı düzeltme
```

**Sütun Eşleme (config/metaAdsMapping.js):**

| CSV Sütunu | DB Sütunu | Dönüşüm |
|---|---|---|
| date_start | date | DATE (zaten YYYY-MM-DD) |
| account_id | account_id | — |
| campaign_name | campaign_name | — |
| adset_id | adset_id | — |
| adset_name | adset_name | — |
| ad_id | ad_id | — |
| ad_name | ad_name | — |
| objective | objective | — |
| buying_type | buying_type | — |
| impressions | impressions | INT cast |
| reach | reach | INT cast |
| frequency | frequency | DECIMAL cast |
| clicks | clicks | INT cast |
| inline_link_clicks | inline_link_clicks | INT cast |
| spend | spend | DECIMAL cast |
| cpc | cpc | DECIMAL cast |
| cpm | cpm | DECIMAL cast |
| cpp | cpp | DECIMAL cast |
| ctr | ctr | DECIMAL, ÷100 |
| inline_link_click_ctr | inline_link_click_ctr | DECIMAL, ÷100 |
| actions:link_click | action_link_click | INT cast |
| actions:landing_page_view | action_landing_page_view | INT cast |
| actions:offsite_conversion.fb_pixel_view_content | pixel_view_content | INT cast |
| actions:offsite_conversion.fb_pixel_add_to_cart | pixel_add_to_cart | INT cast |
| actions:offsite_conversion.fb_pixel_initiate_checkout | pixel_initiate_checkout | INT cast |
| actions:offsite_conversion.fb_pixel_purchase | pixel_purchase | INT cast |
| action_values:offsite_conversion.fb_pixel_purchase | pixel_purchase_value | DECIMAL cast |
| actions:page_engagement | action_page_engagement | INT cast |
| actions:post_engagement | action_post_engagement | INT cast |
| actions:video_view | action_video_view | INT cast |

**Zorunlu alanlar:** date, campaign_name, ad_id
**FK kontrolü:** campaign_name → campaigns.campaign_name

---

## Kaynak 4: meta_ads_breakdowns.csv → meta_ads_breakdowns

**Dönüşümler:** Yok — veri zaten temiz.

**Sütun Eşleme (config/metaBreakdownsMapping.js):**

| CSV Sütunu | DB Sütunu |
|---|---|
| date_start | date |
| campaign_name | campaign_name |
| adset_name | adset_name |
| ad_name | ad_name |
| publisher_platform | publisher_platform |
| platform_position | platform_position |
| impression_device | impression_device |
| impressions | impressions |
| clicks | clicks |
| spend | spend |

**FK kontrolü:** campaign_name → campaigns.campaign_name

---

## Kaynak 5: google_ads.csv → google_ads

**Dönüşümler (transformer.js):**
```
cost_micros → cost_tl: değer / 1.000.000
average_cpc → avg_cpc_tl: değer / 1.000.000
average_cpm → avg_cpm_tl: değer / 1.000.000
cost_per_conversion → cost_per_conversion_tl: değer / 1.000.000
Noktalı sütun adları → snake_case (segments.date → date)
```

**Sütun Eşleme (config/googleAdsMapping.js):**

| CSV Sütunu | DB Sütunu | Dönüşüm |
|---|---|---|
| segments.date | date | DATE (zaten YYYY-MM-DD) |
| customer.id | customer_id | — |
| customer.descriptive_name | customer_name | — |
| campaign.id | campaign_id | — |
| campaign.name | campaign_name | — |
| campaign.status | campaign_status | — |
| campaign.advertising_channel_type | channel_type | — |
| ad_group.id | ad_group_id | — |
| ad_group.name | ad_group_name | — |
| ad_group.status | ad_group_status | — |
| segments.device | device | — |
| segments.ad_network_type | ad_network_type | — |
| segments.product_item_id | product_item_id | nullable |
| segments.product_title | product_title | nullable |
| segments.product_brand | product_brand | nullable |
| segments.product_type_l1 | product_type_l1 | nullable |
| segments.product_type_l2 | product_type_l2 | nullable |
| ad_group_criterion.keyword.text | keyword_text | nullable |
| ad_group_criterion.keyword.match_type | keyword_match_type | nullable |
| metrics.impressions | impressions | INT |
| metrics.clicks | clicks | INT |
| metrics.cost_micros | cost_tl | DECIMAL, ÷1.000.000 |
| metrics.ctr | ctr | DECIMAL (zaten 0-1) |
| metrics.average_cpc | avg_cpc_tl | DECIMAL, ÷1.000.000 |
| metrics.average_cpm | avg_cpm_tl | DECIMAL, ÷1.000.000 |
| metrics.conversions | conversions | DECIMAL |
| metrics.conversions_value | conversions_value | DECIMAL |
| metrics.all_conversions | all_conversions | DECIMAL |
| metrics.all_conversions_value | all_conversions_value | DECIMAL |
| metrics.cost_per_conversion | cost_per_conversion_tl | DECIMAL, ÷1.000.000 |
| metrics.conversions_from_interactions_rate | conversion_rate | DECIMAL |
| metrics.value_per_conversion | value_per_conversion | DECIMAL |
| metrics.search_impression_share | search_impression_share | DECIMAL, nullable |
| metrics.search_budget_lost_impression_share | search_budget_lost_is | DECIMAL, nullable |
| metrics.search_rank_lost_impression_share | search_rank_lost_is | DECIMAL, nullable |
| metrics.view_through_conversions | view_through_conversions | INT |
| metrics.interaction_rate | interaction_rate | DECIMAL |

**FK kontrolü:**
- campaign_name → campaigns.campaign_name
- product_item_id → products.sku (nullable, eşleşmeme hata değil)

---

## Kaynak 6-11: Temiz Tablolar (Dönüşüm Yok)

Bu tablolarda transformer.js işlem yapmaz — direkt mapper.js'e geçer.

| CSV | DB Tablosu | Zorunlu Alanlar |
|---|---|---|
| orders.csv | orders | order_id, order_date, customer_id |
| order_items.csv | order_items | order_id, line_id, item_id |
| products.csv | products | sku, product_name, category |
| customers.csv | customers | customer_id, registration_date |
| campaigns.csv | campaigns | campaign_name, platform |
| channel_mapping.csv | channel_mapping | source, medium, channel_group |

**orders.csv özel kontrolü:**
- customer_id → customers.customer_id (FK — eşleşmeme hata)
- campaign_name → campaigns.campaign_name (soft — nullable, eşleşmeme uyarı)
- source + medium → channel_mapping (soft — eşleşmeme uyarı, import_errors'a yaz)

---

## Duplicate Checker Kuralları

```javascript
// duplicateChecker.js — bu tarih aralığı daha önce yüklendi mi?
async function checkDuplicate(sourceTable, dateFrom, dateTo) {
  // imports tablosunda aynı source_table + tarih aralığı var mı?
  // Varsa kullanıcıya uyarı ver: "Bu tarih aralığı mevcut, üzerine yazmak ister misin?"
}
```

**Strateji:**
- `ga4_traffic`, `meta_ads`, `google_ads` → tarih aralığı kontrolü
- `orders`, `order_items` → order_id PK zaten unique
- `products`, `customers`, `campaigns` → PK zaten unique, upsert mantığı

---

## Hata Yönetimi

**import_errors tablosuna yazılacak durumlar:**
- Zorunlu alan eksik
- Tip uyumsuzluğu (string alanda int bekleniyor)
- FK eşleşme hatası (hard FK için)
- Soft FK eşleşmemesi (uyarı seviyesinde)

**Import yine de devam eder** — tek hatalı satır tüm import'u durdurmaz.
`imports.error_rows` sayacı artırılır, kullanıcıya rapor gösterilir.

**Rollback durumları:**
- DB bağlantısı koptu
- Transaction içinde kritik hata
- Kullanıcı DELETE /imports/:id çağırdı
