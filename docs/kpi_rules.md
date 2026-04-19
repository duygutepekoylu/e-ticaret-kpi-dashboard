# docs/kpi_rules.md — KPI Kuralları ve Formüller

## Temel Prensipler

**Gelir kaynağı:** Her zaman `orders` tablosu.
Meta `pixel_purchase_value` ve Google `conversions_value` kullanılmaz.

**Weighted average zorunluluğu:** Farklı hacimli kaynakları birleştirirken
basit AVG yanıltıcıdır. Aşağıdaki metrikler session sayısıyla ağırlıklandırılır:
- `bounce_rate`
- `pages_per_session`
- `avg_session_duration`

**KPI hesaplama tetiklenme:** Import commit sonrası otomatik.
Manuel tetikleme: `POST /api/v1/kpi/run`

---

## formulas.js — Merkezi Formüller

Tüm KPI hesaplamaları bu fonksiyonları kullanır. Başka yerde formül yazılmaz.

```javascript
// Weighted average — bounce_rate, pages_per_session, avg_session_duration için
weightedAvg(rows, valueField, weightField)
// Örnek: weightedAvg(rows, 'bounce_rate', 'sessions')
// = SUM(bounce_rate * sessions) / SUM(sessions)

// ROAS — spend=0 ise null döner, 0'a bölme hatası önlenir
roas(revenue, spend)
// = spend > 0 ? revenue / spend : null

// Büyüme oranı — previous=0 ise null döner
growthRate(current, previous)
// = previous > 0 ? (current - previous) / previous : null

// Dönüşüm oranı
conversionRate(orders, sessions)
// = sessions > 0 ? orders / sessions : 0

// Cohort retention
cohortRetentionRate(active, total)
// = total > 0 ? active / total : 0
```

---

## Trafik KPI'ları — kpi_daily_traffic

Kaynak: `ga4_traffic`
Granülarite: gün + channel_group

| KPI | Formül | Not |
|---|---|---|
| Toplam Oturum | `SUM(sessions)` | |
| Tekil Kullanıcı | `SUM(total_users)` | |
| Yeni Kullanıcı | `SUM(new_users)` | |
| Bounce Rate | `weightedAvg(bounce_rate, sessions)` | Weighted — basit AVG değil |
| Oturum Başına Sayfa | `weightedAvg(pages_per_session, sessions)` | Weighted |
| Ortalama Oturum Süresi | `weightedAvg(avg_session_duration, sessions)` | Weighted, saniye |
| Engaged Sessions | `SUM(engaged_sessions)` | |
| Dönüşüm | `SUM(conversions)` | |
| Satın Alma Geliri | `SUM(purchase_revenue)` | |
| Kullanıcı Başına Gelir | `purchase_revenue / total_users` | |
| Trafik Büyüme Oranı | `growthRate(current_sessions, prev_sessions)` | İlk gün NULL |

---

## Reklam KPI'ları — kpi_daily_ads

Kaynak: `meta_ads` + `google_ads` (UNION ALL ile birleştirilir)
Granülarite: gün + platform + campaign_name

**platform değerleri:** `meta`, `google`, `total` (her ikisinin toplamı)

| KPI | Meta Kaynağı | Google Kaynağı | Not |
|---|---|---|---|
| Harcama | `spend` | `cost_tl` | Her ikisi TL cinsinden |
| Gösterim | `impressions` | `impressions` | |
| Tıklama | `clicks` | `clicks` | |
| CTR | `ctr` (0-1) | `ctr` (0-1) | Her ikisi normalize edilmiş |
| CPC | `cpc` | `avg_cpc_tl` | |
| CPM | `cpm` | `avg_cpm_tl` | |
| Dönüşüm | `pixel_purchase` | `conversions` | |
| Gelir | **orders tablosundan** | **orders tablosundan** | Kritik kural |
| ROAS | `roas(revenue, spend)` | `roas(revenue, spend)` | NULL if spend=0 |
| Dönüşüm Başı Maliyet | `spend / conversions` | `spend / conversions` | |
| Frequency | `frequency` | NULL | Sadece Meta'da var |
| Harcama Büyüme | `growthRate(spend, prev_spend)` | | İlk gün NULL |
| ROAS Büyüme | `growthRate(roas, prev_roas)` | | İlk gün NULL |

**Gelir hesabı (ROAS için):**
```sql
SELECT SUM(o.net_revenue) as revenue
FROM orders o
WHERE o.campaign_name = [kampanya_adı]
  AND DATE(o.order_date) = [tarih]
```

---

## Satış KPI'ları — kpi_daily_sales

Kaynak: `orders` + `order_items`
Granülarite: gün

| KPI | Formül | Not |
|---|---|---|
| Toplam Sipariş | `COUNT(order_id)` | completed + shipped |
| Toplam Ciro | `SUM(order_revenue)` | |
| Net Gelir | `SUM(net_revenue)` | revenue - discount - refund |
| Satılan Ürün | `SUM(quantity)` | order_items tablosundan |
| Ortalama Sepet | `net_revenue / total_orders` | |
| Kullanıcı Başına Gelir | `net_revenue / total_users` | ga4_traffic join |
| Yeni Müşteri Geliri | `SUM(net_revenue WHERE first_order_date = bugün)` | |
| Geri Dönen Gelir | `SUM(net_revenue WHERE first_order_date < bugün)` | |
| Tekrar Satın Alma | `COUNT(total_orders > 1) / COUNT(*)` | customers tablosundan |
| İade Oranı | `SUM(refund_amount) / SUM(order_revenue)` | 0-1 arası |
| İndirim Oranı | `SUM(discount_amount) / SUM(order_revenue)` | |
| Ciro Büyüme | `growthRate(revenue, prev_revenue)` | İlk gün NULL |

**Not:** `new_customer_revenue + returning_customer_revenue = net_revenue` olmalı.
Bu kontrolü her hesaplamada yap.

---

## Kanal Performansı — agg_channel_performance

Kaynak: `orders` + `ga4_traffic` + `meta_ads` + `google_ads`
Granülarite: gün + channel_group

**Önemli:** Gelir `orders.channel` üzerinden, trafik `ga4_traffic.session_default_channel_group` üzerinden join yapılır.

| Alan | Kaynak | Not |
|---|---|---|
| sessions | ga4_traffic | |
| total_users | ga4_traffic | |
| orders | orders | WHERE channel = channel_group |
| revenue | orders.net_revenue | |
| spend | meta_ads.spend + google_ads.cost_tl | Organic kanalda 0 |
| roas | roas(revenue, spend) | Organic → NULL |
| conversion_rate | orders / sessions | |
| avg_order_value | revenue / orders | |
| revenue_per_user | revenue / total_users | |
| bounce_rate | weightedAvg(bounce_rate, sessions) | |

---

## Kampanya Performansı — agg_campaign_performance

Kaynak: `campaigns` + `meta_ads` + `google_ads` + `orders`
Granülarite: gün + campaign_name + platform

| Alan | Kaynak |
|---|---|
| impressions | meta_ads veya google_ads |
| clicks | meta_ads veya google_ads |
| spend | meta_ads.spend veya google_ads.cost_tl |
| revenue | orders.net_revenue WHERE campaign_name = ? |
| roas | roas(revenue, spend) |
| conversions | orders count WHERE campaign_name = ? |
| ctr | clicks / impressions |
| cpc | spend / clicks |
| avg_order_value | revenue / conversions |
| cost_per_conversion | spend / conversions |

---

## Ürün Performansı — agg_product_performance

Kaynak: `ga4_item_interactions` + `order_items`
Granülarite: gün + item_id

**KRİTİK:** `ga4_item_interactions` ile `ga4_traffic` AYNI SORGUDA birleştirilemez.
GA4 API kısıtı — farklı boyut kapsamları (item-scoped vs session-scoped).

| Alan | Kaynak | Not |
|---|---|---|
| item_list_views | ga4_item_interactions | |
| item_list_clicks | ga4_item_interactions | |
| items_viewed | ga4_item_interactions | |
| items_added_to_cart | ga4_item_interactions | |
| items_purchased | ga4_item_interactions | |
| orders_count | order_items | COUNT distinct order_id |
| revenue | order_items.line_total | |
| cart_to_view_rate | items_added_to_cart / items_viewed | |
| purchase_rate | items_purchased / items_viewed | NULL if viewed=0 |

---

## Cohort Retention — agg_cohort_retention

Kaynak: `customers` + `orders`
Granülarite: cohort_month (YYYY-MM) + offset_month (0,1,2,3...)

**Cohort belirleme:**
```
cohort_month = DATE_FORMAT(customers.first_order_date, '%Y-%m')
```

**Retention hesabı:**
```
offset_month = 0 → ilk ay, retention_rate = 1.0 (tanım gereği)
offset_month = N → cohort müşterilerinin N. ayda kaçı sipariş verdi
```

```sql
-- Örnek: 2024-10 cohort'u için offset=1 (Kasım)
SELECT
  COUNT(DISTINCT o.customer_id) as active_customers,
  SUM(o.net_revenue) as revenue
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
WHERE DATE_FORMAT(c.first_order_date, '%Y-%m') = '2024-10'
  AND DATE_FORMAT(o.order_date, '%Y-%m') = '2024-11'
```

**Doğrulama:** offset=0'da active_customers = total_customers olmalı.

---

## Pazarlama KPI'ları

| KPI | Kaynak | Hesaplama |
|---|---|---|
| Kanal Bazlı Ciro | agg_channel_performance | revenue GROUP BY channel_group |
| Kanal Bazlı Dönüşüm | agg_channel_performance | conversion_rate |
| Kampanya Bazlı Gelir | agg_campaign_performance | revenue GROUP BY campaign_name |
| Yeni vs Geri Dönen | kpi_daily_sales | new_customer_revenue, returning_customer_revenue |
| Günlük Değişim | kpi_daily_* | growth_rate sütunları |
