# process.md — Sporthink Proje Durumu

## Güncel Durum

**Aktif Faz:** Tamamlandı ✅
**Genel İlerleme:** 14/14 faz tamamlandı
**Son Güncelleme:** 2026-04-25

---

## Tamamlanan Fazlar

### Faz 14 — Uçtan Uca Test + Final ✅
Tamamlanma: 2026-04-25
Özet: UX iyileştirmeleri ve son testler tamamlandı. (1) Dashboard hero metric hiyerarşisi: 3 büyük hero kart (Toplam Ciro, Genel ROAS, Oturumlar) FilterPanel'in hemen altına eklendi. `KpiCard`'a `hero` prop eklendi — daha büyük font (38px), daha geniş padding, brand-border ile vurgulama. Detay KPI kartları (9 adet) aşağıda gruplara ayrılmış halde korundu. (2) Aktif filtre badge: `FilterPanel.jsx`'e `ActiveFilterSummary` bileşeni eklendi — aktif filtreler (tarih aralığı + kanal/kampanya/cihaz/şehir) chip satırı olarak görünüyor, tarih dışındaki chipler tıklanarak kaldırılabiliyor. (3) Sidebar collapse, dark logo, metin kontrastı zaten uygulanmıştı — ux_notes.md'de resolved olarak işaretlendi. Uçtan uca testler: Login/auth akışı ✅, KPI summary (sessions, ROAS, revenue) ✅, Dashboard trend (tarih filtreli) ✅, Kanal listesi (9 kanal, orders tablosundan) ✅, Funnel (6 adım, data.funnel) ✅, Audit logs (sayfalama) ✅, Export (GET /export?table=) ✅, Boş tarih aralığı → null değerler, uygulama çökmüyor ✅, Geçersiz token → 401 ✅, Yanlış şifre → 401 INVALID_CREDENTIALS ✅, Organic Search ROAS = null ✅, Bounce rate weighted avg ✅. Responsive tasarım bu fazda yapılmadı (Faz 14 kapsamı dışında bırakıldı).

### Faz 13 — Frontend: Sistem Sayfaları ✅
Tamamlanma: 2026-04-25
Özet: 6 sistem sayfası tamamlandı. `pages/Export/` — 7 KPI/aggregation tablosu için tarih filtreli JSON indirme, her tablo ayrı kart. `pages/Logs/` — audit_logs + api_logs iki sekmeli, server-side sayfalama, method/status/action badge'leri. `pages/Views/` — saved views CRUD; oluştur (filtreler + layout), listele, yükle (filtreleri uygula), sil. `pages/Settings/` — dark mode toggle (localStorage + document.documentElement.classList), varsayılan tarih aralığı, hesap bilgileri (read-only). `pages/Segments/` — segment listesi, kural oluşturucu (kanal/kampanya/şehir), inline önizleme (eşleşen sipariş/müşteri sayısı). `pages/Import/` — drag-drop dosya yükleme, kaynak tablo seçimi, önizleme tablosu, commit/rollback, import geçmişi + hata detayı açılır panel. `App.jsx`'e dark mode başlatma `useEffect`'i eklendi.
Düzeltilen buglar: (1) `filters/campaigns` endpoint'inde `campaign_id` sütunu yoktu → `id AS campaign_id` ile düzeltildi; (2) `CampaignFilter.jsx` kampanya objelerini string olarak render ediyordu → uygulama çöküyordu, `.map(c => c.campaign_name)` ile düzeltildi; (3) tüm yeni sayfalarda `data.views`, `data.segments`, `data.logs`, `data.rows` response format hataları düzeltildi; (4) Views create'de `layout: {}` zorunlu alan eksikti; (5) API logs'ta `path` → `endpoint` sütun adı düzeltildi.
Bilinen kısıt: Import'ta boş/geçersiz zorunlu alan içeren satırlar DB constraint'e takılınca backend tüm transaction'ı rollback ediyor — "hatalı satır raporu, commit devam etsin" davranışı mevcut değil. Faz 14'te veya sonrasında değerlendirilebilir.
UX notları: Dark mod sidebar logosu (siyah → beyaz) ve açıklama metni kontrastı `docs/ux_notes.md`'ye 9. ve 10. tespit olarak eklendi, Faz 14'te ele alınacak.

### Faz 12 — Frontend: Analitik Sayfalar ✅
Tamamlanma: 2026-04-24
Özet: 5 analitik sayfa ve 2 grafik bileşeni tamamlandı. `FunnelChart.jsx` (chartjs-chart-funnel, 6 adım, renk degradesi) ve `HeatmapChart.jsx` (chartjs-chart-matrix, retention rengine göre yeşil→kırmızı skala) yazıldı. `pages/Traffic/` — trafik KPI kartları (oturum, kullanıcı, dönüşüm, hemen çıkma, ort. süre), oturum+kullanıcı trend çizgi grafiği, kanal bazlı oturum bar grafiği. `pages/Channels/` — donut (kanal gelir dağılımı, cross-filter aktif), ROAS bar, ciro vs harcama bar, tüm metriklerin DataTable'ı. `pages/Campaigns/` — Meta vs Google yan yana KPI kartları, top 10 kampanya yatay bar, ROAS vs harcama scatter, 8 kolonlu kampanya tablosu. `pages/Funnel/` — 6 adım huni grafiği + adım detay paneli (renkli oran gösterimi) + DataTable; GA4 "conversion" adımı anomali notu (tüm GA4 dönüşüm tiplerini sayar, purchase'tan büyük çıkabilir). `pages/Cohort/` — retention heatmap (HeatmapChart), kohort bazlı müşteri özet kartları, retention+gelir DataTable; `total_customers > 0` filtresi uygulandı. Tüm sayfalar `useFilters` ile entegre.

### Faz 11 — Frontend: Dashboard Ana Sayfa ✅
Tamamlanma: 2026-04-24
Özet: Top-down yaklaşımla Dashboard sayfası inşa edildi. `utils/format.js` (Türkçe locale: para, yüzde, ROAS, süre formatları) oluşturuldu. `components/kpi/KpiCard.jsx` (skeleton + trend badge) ve `KpiGrid.jsx` yazıldı. Chart bileşenleri: `LineChart`, `BarChart`, `DonutChart`, `ScatterChart` — her biri loading skeleton ve "Veri bulunamadı" empty state yönetiyor. `DataTable.jsx` sıralama ve sayfalama destekli yazıldı. Dashboard sayfası: 12 KPI kartı (trafik/reklam/satış), ciro+oturum trend grafiği, kanal donut, kampanya bar (yatay, top 10), ROAS vs harcama scatter ve kampanya detay tablosu. Tüm bileşenler `useFilters` `apiParams`'a bağlı — filtre değişince otomatik güncelleniyor. Donut kanala tıklayınca cross-filter aktif. Trend okları önceki dönem karşılaştırmasıyla (ikinci paralel `/kpi/summary` çağrısı): seçili aralığın aynı uzunluktaki önceki dönemiyle karşılaştırma, önceki dönem verisi yoksa ok gizleniyor. `useFilters` varsayılan tarihleri boşa alındı; Dashboard mount'ta DB'den gerçek veri aralığını çekip filtreye set ediyor.
Düzeltilen buglar: (1) `useUrlSync` default tarihleri URL'e yazıp date range fetch'ini bloke ediyordu → `getDefaultDates()` boş string döndürecek şekilde değiştirildi; (2) trend verisinde tarih başına birden fazla satır (kaynak bazlı) → frontend'de tarihe göre gruplama eklendi.
Kararlar: react-grid-layout ve saved views bu fazda yok (sonraya ertelendi); PivotTable Dashboard'dan çıkarıldı; responsive tasarım Faz 14'te. Sunum için Q1 2025 / Q4 2024 karşılaştırması trend oklarını tam gösterir.

### Faz 10 — Frontend: Filtre Sistemi ✅
Tamamlanma: 2026-04-24
Özet: React Context tabanlı global filtre sistemi (`hooks/useFilters.js`) oluşturuldu. `useUrlSync.js` hook'u ile filtre değerlerinin URL query string ile çift yönlü senkronizasyonu sağlandı (sayfa yenilense de filtreler kaybolmuyor). DateRangePicker, ChannelFilter, CampaignFilter, DeviceFilter ve CityFilter gibi bileşenler kodlandı. Gelişmiş filtreler (roas ve revenue min/max) için bir toggle yapısı ve aktif filtre sayacı eklendi. Tüm bu bileşenleri içeren responsive `FilterPanel.jsx` ana layout bileşeni yazıldı. CLAUDE.md yönergelerine uygun olarak, tasarım felsefesi uygulandı: Futura font entegre edildi, `@font-face` yolları build sırasında Vite tarafından doğru çözülecek şekilde göreceli (relative) hale getirildi, logolar `assets/logo/` altına klasörlenip kullanıma hazırlandı.
Testler: Vite build test edildi ve hatalı yollar giderildi. URL ↔ UI senkronizasyonu tamam. (Cross-filter ve dashboard grafik testleri Faz 11'e bırakıldı).

---

### Faz 9 — Frontend Kurulum + Routing ✅
Tamamlanma: 2026-04-23
Özet: Vite + React + Tailwind CSS v4 (`@tailwindcss/vite` plugin) kuruldu. `vite.config.js`'e
proxy eklendi (/api → localhost:3001) — frontend ile backend aynı origin gibi çalışıyor.
`services/api.js`: axios base instance, request interceptor (JWT token), response interceptor
(401 → localStorage temizle + /login'e yönlendir). `contexts/AuthContext.jsx`: login/logout
fonksiyonları, localStorage senkronizasyonu. `components/ui/ProtectedRoute.jsx`: token yoksa
login'e yönlendirir. `components/ui/PublicRoute.jsx`: giriş yapmışken /login'e erişimi engeller.
`components/layout/Sidebar.jsx`: 13 sayfa nav link, aktif link highlight (NavLink isActive),
kullanıcı e-posta + rol gösterimi, çıkış butonu. `components/layout/PageWrapper.jsx`: başlık +
alt başlık + action alanı. Login sayfası: form validasyon, hata gösterimi, JWT alıp
AuthContext'e kaydet. 13 placeholder sayfa. Tüm test kriterleri geçti:
- npm run dev → hata yok, port 5173 ✅
- Giriş olmadan / → /login yönlendirmesi ✅
- Yanlış şifre → hata mesajı ✅
- admin@sporthink.com / admin123 → Dashboard ✅
- 13 sidebar linki çalışıyor ✅
- Giriş yapmışken /login → Dashboard ✅
- Token interceptor çalışıyor ✅
Not: macOS Homebrew MySQL + tcp (127.0.0.1) üzerinden bağlantı.
GitHub'a push edildi: https://github.com/duygu364/e-ticaret-kpi-dashboard

---

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
- @tanstack/react-table ve react-grid-layout bağımlılık olarak eklendi, henüz kullanılmıyor

### Ertelenen Kararlar
- meta_ads_breakdown_demographic ve geo tabloları — şu an kapsam dışı
- Partition stratejisi — production geçişinde uygulanacak
- Canlı API bağlantıları — production kapsamında
- Pivot view — Dashboard'dan çıkarıldı, ihtiyaç duyulursa Faz 14'te değerlendirilebilir
- Drag-drop layout — Faz 14'te değerlendirilebilir
- pages/Filters — saved_views tablosu bu ihtiyacı karşıladığı için kapsam dışı bırakıldı

### Sıradaki Adımlar
- **Faz 13:** 6 sistem sayfası — Import (en büyük iş), Segments, Views, Export, Logs, Settings
- **Faz 14:** Responsive tasarım + görsel polish + final test
