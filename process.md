# process.md — Sporthink Proje Durumu

## Güncel Durum

**Aktif Faz:** Faz 9 — Frontend Kurulum + Routing
**Genel İlerleme:** 8/14 faz tamamlandı
**Son Güncelleme:** 2026-04-22

---

## Tamamlanan Fazlar

### Faz 8 — REST API: KPI + Dashboard + Diğer Endpoint'ler ✅
Tamamlanma: 2026-04-22
Özet: Tüm Faz 8 endpoint'leri yazıldı ve 9/9 test geçti. `controllers/kpiController.js`: KPI run
(runAllKpi tetikleme) ve summary (traffic+ads+sales özet metrikleri, weighted avg ile). `controllers/
dashboardController.js`: trend (günlük kpi_daily_traffic+sales+ads JOIN), channel-performance
(agg_channel_performance'dan GROUP BY), platform-performance (Meta vs Google kpi_daily_ads'dan),
campaign-performance (agg_campaign_performance'dan, platform filtresiyle), funnel (6 adım:
session_start → view_item → add_to_cart → begin_checkout → purchase → conversion, drop-off oranlarıyla).
`routes/v1/filters.js`: channels (orders tablosundan), campaigns, devices, cities (ga4_traffic),
date-range (kpi_daily_traffic min/max). `routes/v1/views.js`: saved_views CRUD (GET/POST/PUT/DELETE),
is_default single-default garantisi, auditLog entegrasyonu. `routes/v1/segments.js`: segments CRUD
+ GET /:id/preview (rules JSON'dan orders+customers sorgusu). `routes/v1/export.js`: ALLOWED_TABLES
whitelist ile SQL injection koruması, 7 tablo JSON export. `routes/v1/logs.js`: audit_logs ve
api_logs listeleme (sadece admin, sayfalama ile). `routes/v1/normalize.js`: channel_mapping →
orders.channel güncelleme. Düzeltilen buglar: (1) dashboardController'da `t.users` → `t.total_users
AS users` (şema uyumsuzluğu); (2) logs.js'de LIMIT/OFFSET prepared statement hatası → string
interpolation ile çözüldü. Tüm test kriterleri geçti:
- Dashboard trend: 279 günlük veri, tarih filtresiyle ✅
- Channel performance: 9 kanal, orders tablosundan ✅
- Funnel: 6 adım sıralı, drop-off oranlarıyla ✅
- Filters: 9 benzersiz kanal orders'dan ✅
- Views CRUD: oluştur → getir → sil döngüsü ✅
- Segments CRUD + preview: 2417 sipariş / 1836 müşteri eşleşmesi ✅
- Export: 1638 satır kpi_daily_traffic JSON ✅
- Audit logs: 48 kayıt, sayfalama çalışıyor ✅
- Swagger: 36 endpoint dokümante ✅
Not: Funnel Adım 6 (conversion) değeri purchase'dan büyük çıkıyor — bu GA4'teki tüm
dönüşüm tiplerini saymasından kaynaklanıyor (satın alma dışı form, kayıt vb.). Veri hatası
değil; Faz 12 Funnel sayfasında açıklama notu eklenebilir.

---

### Faz 7 — REST API: Auth + Import Endpoint'leri ✅
Tamamlanma: 2026-04-22
Özet: `controllers/authController.js`: bcryptjs şifre karşılaştırma, JWT imzalama, updateLastLogin,
audit log. `controllers/importController.js`: multer ile dosya yükleme, preview (DB'ye yazmadan),
validate, commit (runImport + KPI tetikleme), rollback, import_errors listeleme. `row_number`
MySQL reserved keyword → backtick ile escape edildi. `controllers/mappingController.js`:
channel_mapping CRUD — composite PK (source, medium) kullanıldı. Tüm route'lara Swagger JSDoc
yorumları eklendi. `app.js`: auth rotaları verifyToken'dan önce mount edildi (login public,
diğerleri protected). Kritik karar: **Sequelize tamamen kaldırıldı** — `validator` paketi
100+ dosya yükleyerek startup'ta 5+ dakika bekletiyordu. `user.js` ve `import.js` tamamen
mysql2/promise pool ile yeniden yazıldı. `database.js`'den `getSequelize` / Sequelize kaldırıldı.
Tüm test kriterleri geçti:
- Login → JWT token ✅
- Yanlış şifre → 401 INVALID_CREDENTIALS ✅
- Token yok → 401 UNAUTHORIZED ✅
- Viewer ile commit → 403 FORBIDDEN ✅
- campaigns.csv yükle → importId=21, status=committed, successRows=19 ✅
- Preview → 10 satır, DB'de yeni kayıt yok ✅
- Rollback → status=rolled_back ✅
- Import errors → total=0 (hata yok) ✅
- Channel CRUD → create/update/delete OK ✅
Not: macOS disk I/O yavaşlığı nedeniyle soğuk başlatma ~6 dakika sürüyor.
Sunucu bir kez başlatılıp çalışır durumda tutulmalı.

---

### Faz 6 — KPI Motoru: Channel + Campaign + Product + Cohort ✅
Tamamlanma: 2026-04-21
Özet: `kpi/channel.js`: orders.channel bazında gelir, ga4_traffic bazında trafik, meta+google
spend'i campaign_name → orders.channel mapping üzerinden; Organic kanalda spend=0 → roas=NULL.
`kpi/campaign.js`: meta + google her biri için ayrı platform satırı; gelir + dönüşüm orders
tablosundan campaign_name join ile. `kpi/product.js`: ga4_item_interactions + order_items,
ga4_traffic ile AYNI SORGUDA JOIN YOK (GA4 item-scoped vs session-scoped kısıtı korundu).
`kpi/cohort.js`: PERIOD_DIFF ile offset_month hesabı, YYYY-MM formatı, cohort_totals yalnızca
completed/shipped siparişleri sayar — offset=0'da retention=1.0 garantisi. runner.js Faz 6
modülleriyle güncellendi, runAllKpi() artık 7 tabloyu çalıştırıyor. Tüm test kriterleri geçti:
- agg_channel_performance=1435, agg_campaign_performance=2056 satır ✅
- agg_product_performance=29710 satır (ga4_item_interactions bazlı) ✅
- agg_cohort_retention=72 satır, offset=0 retention=1.0 (0 uyumsuz) ✅
- Organic ROAS=NULL, ROAS geliri orders'dan, purchase_rate formülü doğru ✅
Önemli not: cohort.js'de total_customers = orders'dan completed/shipped filtreyle hesaplandı
(customers tablosundaki raw count değil) — bu tutarlılığı garanti eden kritik karar.

---

### Faz 5 — KPI Motoru: Traffic + Ads + Sales ✅
Tamamlanma: 2026-04-21
Özet: `kpi/formulas.js`: 5 merkezi formül — weightedAvg, roas, growthRate, conversionRate,
cohortRetentionRate. Başka yerde formül yazılmaz. `kpi/traffic.js`: ga4_traffic →
kpi_daily_traffic; bounce_rate, pages_per_session, avg_session_duration, engagement_rate
SQL'de weighted avg (SUM(val*sessions)/SUM(sessions)), traffic_growth_rate JS'de önceki
gün karşılaştırması (takvim boşlukları güvenli). `kpi/ads.js`: meta_ads + google_ads →
kpi_daily_ads; gelir her zaman orders tablosundan campaign_name join ile alınır
(pixel_purchase_value ve conversions_value kullanılmaz); Google frequency=NULL, Meta
frequency=değer. `kpi/sales.js`: orders + order_items + customers → kpi_daily_sales;
new_customer_revenue = first_order_date aynı gün, returning_customer_revenue = geri kalan
(future_fod anomalisi dahil), toplamı net_revenue'ya eşit. `kpi/runner.js`: refresh_logs
kaydı transaction dışı açılır (rollback olsa log kalır), runAllKpi / runTrafficKpi /
runAdsKpi / runSalesKpi export edilir. Tüm test kriterleri geçti:
- weightedAvg: 0.305941 ✅
- roas(spend=0)=null, roas(1000,100)=10 ✅
- growthRate(120,100)=0.2 ✅
- bounce_rate weighted avg doğrulandı ✅
- ROAS: orders.revenue=ads.revenue (pixel değil) ✅
- Google frequency=NULL ✅
- new+returning=net_revenue (0 uyumsuz gün) ✅
- kpi_daily_traffic=1638, kpi_daily_ads=2056, kpi_daily_sales=182 satır ✅
Önemli not: mysql2 DATE sütunlarını JS Date objesi döndürür → toDateStr() yardımcı
fonksiyonu ile normalize edildi (traffic/ads/sales'de). Seed verisinde bazı müşterilerin
first_order_date'i sipariş tarihinden ileride (future_fod anomalisi) — returning bucket'a
dahil edildi, toplamı garantilemek için.

---

### Faz 4 — Import: Transformer + Mapper + Importer ✅
Tamamlanma: 2026-04-20
Özet: Import pipeline'ının ikinci yarısı tamamlandı. `transformer.js`: kaynak bazlı
dönüşüm dispatcher — GA4 date int→DATE, Meta CTR ÷100, Google cost_micros ÷1.000.000.
`mapper.js`: mapRow (CSV→DB sütun adı), mapRawRow (ham CSV değerleri raw tabloya).
`duplicateChecker.js`: aynı tarih aralığına ait tamamlanmış import varsa uyarı döndürür.
`importer.js`: tam pipeline — validate → raw INSERT → transform → map → clean INSERT,
mysql2 transaction ile atomik (hata → otomatik rollback). `importWithRawTable` ve
`importDirectToClean` olmak üzere iki strateji. `updateImportStatus` raw SQL ile yazıldı
(Sequelize bypass — macOS socket EPIPE sorununu önler). Tüm test kriterleri geçti:
- Transformer GA4/Meta/Google dönüşümleri ✅
- Mapper sütun adı eşleme ✅
- Import: 5 satır → raw_ga4_traffic=5, ga4_traffic=5 ✅
- imports.status=committed, success_rows=5, error_rows=0 ✅
- Duplicate checker: aynı tarih aralığı → uyarı mesajı ✅
- Rollback: raw_ga4_traffic=0, imports.status=rolled_back ✅
Önemli kararlar: Sequelize lazy load yapıldı (`getSequelize()` factory ile) — validator
paketinin 104 dosyası standalone scriptlerde yüklemeyi yavaşlatıyordu. MySQL 9.x TCP
bağlantısında `ssl:false` gerekli; socket bağlantısında ise ssl:false EPIPE'a yol açıyor
(ikisi birbirinden ayrı tutuldu). Test dosyaları temizlenecek (test_faz4.js, test_seqconn.js,
test_server.js).

---

### Faz 3 — Import: Parser + Previewer + Validator ✅
Tamamlanma: 2026-04-20
Özet: `backend/src/importer/` dizini oluşturuldu. 11 mapping config dosyası yazıldı
(ga4Traffic, ga4Items, metaAds, metaBreakdowns, googleAds, orders, orderItems, products,
customers, campaigns, channelMapping). Her config: CSV→DB sütun eşlemesi, tip bilgisi,
zorunlu alan listesi, hard/soft FK kontrol tanımları, duplicate stratejisi içeriyor.
3 parser: csvParser (csv-parse, BOM desteği), xlsxParser (xlsx ilk sheet),
jsonParser (array doğrulama). previewer.js: DB'ye yazmadan ilk 10 satır + mapping önerisi.
validator.js: validateRows (satır bazlı tip+zorunlu), validateHeaders (header kontrolü).
Tüm test kriterleri geçti:
- CSV parser: ga4_traffic.csv → 46.317 satır ✅
- XLSX parser: test dosyası → doğru satır sayısı ✅
- JSON parser: test dosyası → doğru parse ✅
- Bozuk CSV → anlamlı hata mesajı ✅
- Previewer: ilk 10 satır, DB'de kayıt yok ✅
- Validator zorunlu alan eksik → hata raporu ✅
- Validator tip hatası (impressions="abc") → hata raporu ✅
- Validator geçerli veri → hata yok ✅
Not: UTF-8 BOM karakteri csvParser'da `bom: true` ile otomatik temizleniyor.

**Ek (2026-04-21) — Tam Veri İmportu:** Faz 4 sonrası tüm CSV fixture'ları clean tablolara
başarıyla yüklendi. Düzeltilen buglar: (1) metaAdsMapping.js'de `account_name` ve `campaign_id`
columns dizisine eklenmemişti; (2) importer.js'de soft FK kontrolü `mapping.softFkChecks` (boş
dizi) yerine `mapping.fkChecks.filter(severity==='soft')` kullanacak şekilde düzeltildi;
(3) import_all.js'e pool warmup (SELECT 1 + 300ms) eklendi — ilk bağlantıda EPIPE önlendi.
Final satır sayıları: ga4_traffic=46.317, ga4_item_interactions=29.710, meta_ads=2.994,
meta_ads_breakdowns=26.946, google_ads=28.873.

---

### Faz 1 — Veritabanı Kurulum ✅
Tamamlanma: 2026-04-19
Özet: MySQL 9.6 (Homebrew) üzerinde `sporthink` veritabanı oluşturuldu.
`sporthink_schema.sql` çalıştırıldı, 32 tablo başarıyla oluştu. MySQL 9.6
uyumluluğu için iki schema düzeltmesi yapıldı: `row_number` reserved keyword
backtick ile escape edildi; `uq_ga4_traffic` ve `uq_meta_bd` UNIQUE index'lerindeki
VARCHAR prefix uzunlukları utf8mb4 3072-byte limitine uyacak şekilde küçültüldü.
`database/scripts/seedDatabase.js` yazıldı ve çalıştırıldı. Tüm test kriterleri geçti:
- SHOW TABLES → 32 tablo ✅
- FK testi: geçersiz customer_id → ERROR 1452 (fk_orders_customer) ✅
- UNIQUE testi: ga4_traffic'e duplicate satır → ERROR 1062 (uq_ga4_traffic) ✅
- Satır sayıları: products=402, customers=5000, campaigns=19, orders=14299,
  order_items=27406, raw_ga4_traffic=46317, raw_ga4_item_interactions=29710,
  raw_meta_ads=2994, raw_meta_ads_breakdowns=26946, raw_google_ads=28873,
  channel_mapping=16 — hepsi beklenenle tam eşleşti ✅
Not: ORM kararı alındı — Sequelize (CRUD: users, imports, saved_views, segments,
audit_logs, api_logs) + Raw SQL/mysql2 (KPI, aggregation, analytics) hybrid yaklaşım.

---

## Faz 2 — Backend Kurulum + Modeller ✅
Tamamlanma: 2026-04-20
Özet: Express + JWT + middleware stack kuruldu. 4 kritik bug çözüldü: (1) Sequelize
`host: null` macOS socket hang → `host: '127.0.0.1'` yapıldı; (2) `/health` route
notFoundHandler'dan sonraydı → öne taşındı; (3) `dbReady` değişkeni kullanımdan
sonra tanımlanıyordu → en üste taşındı; (4) `swagger-jsdoc` + `swagger-ui-express`
startup'ta yüzlerce dosya okuyarak askıya alıyordu → tam lazy load yapıldı (sadece
/api/v1/docs isteğinde yüklenir). Tüm test kriterleri geçti:
- GET /health → `{ success: true, db: "connected" }` ✅
- Token yok → 401 UNAUTHORIZED ✅
- viewer token + admin endpoint → 403 FORBIDDEN ✅
- Olmayan route → `{ success: false, error: { code: "NOT_FOUND" } }` ✅
- 11 model dosyası oluşturuldu, DB bağlantısı + SELECT sorguları çalışıyor ✅
Not: swagger-jsdoc lazy load nedeniyle /api/v1/docs ilk açılışta yavaş olabilir.
routes/v1/*.js glob'u da lazy'e dahil edildi — route dosyaları eklenince otomatik
taranacak.

---

## Faz 1 — Veritabanı Kurulum ✅ (Tamamlandı)

---

## Alınan Kararlar ve Notlar

Bu bölüm geliştirme sırasında önemli kararlar ve karşılaşılan
durumlar için kullanılır. Her faz tamamlandığında özet buraya eklenir.

### Veritabanı Kararları
- 32 tablo, 36 FK, 28 index (24 performans + 4 UNIQUE)
- Raw katman: sadece dış API kaynaklı 5 tablo
- ROAS: gelir orders tablosundan — reklam platformu değerleri kullanılmaz
- Partition: hazır ama dummy veri için uygulanmadı
- **Bağlantı: TCP (127.0.0.1:3306), Unix socket KALDIRILDI** — macOS + MySQL 9.x + Unix
  socket kombinasyonunda standalone Node.js scriptleri ilk bağlantıda EPIPE hatası
  alıyordu. `.env`'den `DB_SOCKET` kaldırıldı, `DB_HOST=127.0.0.1` yapıldı. TCP yolunda
  `ssl: false` zaten vardı. Warmup/retry mantığı tüm scriptlerden temizlendi.

### Teknoloji Kararları
- Cache yok — aggregation tablolar önbellek görevi yapıyor
- swagger-jsdoc ile koddan üretim
- react-chartjs-2 + chartjs-chart-funnel + chartjs-chart-matrix
- @tanstack/react-table (pivot view)
- react-grid-layout (drag-drop dashboard)

### Ertelenen Kararlar
- meta_ads_breakdown_demographic ve geo tabloları — toplantıda
  netleştirilecek, şu an kapsam dışı
- Partition stratejisi — production geçişinde uygulanacak
- Canlı API bağlantıları — production kapsamında

---

## Sıradaki Adım

**Faz 1'i başlatmak için:**
1. MySQL'in çalıştığını doğrula
2. `database/fixtures/raw/` klasörüne CSV'leri kopyala
3. `roadmap.md` → Faz 1 adımlarını takip et
