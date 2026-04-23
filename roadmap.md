# Sporthink KPI Dashboard — Roadmap

## Kurallar
- Her faz tamamlanmadan bir sonrakine geçilmez
- Her fazın sonunda tüm test kriterleri karşılanmalı
- Agent her faz sonunda process.md'yi günceller
- Hata varsa düzelt, sonra ilerle

---

## Faz 1 — Veritabanı Kurulum

### Yapılacaklar
- [x] MySQL veritabanı oluştur: `CREATE DATABASE sporthink`
- [x] `database/schema/sporthink_schema.sql` çalıştır
- [x] 32 tablo oluştuğunu doğrula
- [x] `database/fixtures/raw/` altına tüm CSV'leri kopyala
- [x] `database/scripts/seedDatabase.js` yaz ve çalıştır
- [x] Tüm FK kısıtlarını test et

### Test Kriterleri
- [x] `SHOW TABLES` → 32 tablo görünmeli
- [x] Her tablo için `DESCRIBE [tablo]` → sütunlar doğru
- [x] FK testi: geçersiz customer_id ile order eklemeye çalış → hata vermeli
- [x] UNIQUE index testi: aynı GA4 satırını iki kez ekle → hata vermeli
- [x] Seed sonrası satır sayıları:
  - products: 402
  - customers: 5.000
  - campaigns: 19
  - orders: 14.299
  - order_items: 27.406
  - ga4_traffic: 46.317
  - ga4_item_interactions: 29.710
  - meta_ads: 2.994
  - meta_ads_breakdowns: 26.946
  - google_ads: 28.873
  - channel_mapping: 16

### Geçiş Onayı
Tüm tablolar oluştu + seed verileri doğru yüklendi → Faz 2'ye geç

---

## Faz 2 — Backend Kurulum + Modeller

### Yapılacaklar
- [x] `backend/package.json` oluştur — bağımlılıklar:
  - express, mysql2, sequelize, jsonwebtoken, bcryptjs
  - multer (dosya yükleme), csv-parse, xlsx
  - dotenv, cors, helmet, morgan
  - swagger-jsdoc, swagger-ui-express
- [x] `backend/.env.example` oluştur
- [x] `backend/src/config/database.js` — MySQL bağlantı pool
- [x] `backend/src/config/env.js` — ortam değişkenleri doğrulama
- [x] `backend/src/middleware/auth.js` — JWT verify + requireRole
- [x] `backend/src/middleware/requestLogger.js` — api_logs tablosuna yaz
- [x] `backend/src/middleware/errorHandler.js` — merkezi hata yönetimi
- [x] `backend/src/utils/formatters.js` — `{ success, data, meta }` response
- [x] `backend/src/utils/auditLogger.js` — audit_logs tablosuna yaz
- [x] `backend/src/utils/dbHelpers.js` — pagination, date format yardımcıları
- [x] `backend/app.js` — Express setup, middleware kayıtları, route bağlantıları
- [x] Model dosyaları (her biri CRUD + özel sorgular):
  - `models/order.js`
  - `models/orderItem.js`
  - `models/customer.js`
  - `models/campaign.js`
  - `models/product.js`
  - `models/ga4Traffic.js`
  - `models/ga4ItemInteraction.js`
  - `models/metaAds.js`
  - `models/googleAds.js`
  - `models/import.js`
  - `models/user.js`

### Test Kriterleri
- [x] `npm start` → sunucu ayağa kalkmalı, hata yok
- [x] DB bağlantısı: `GET /health` → `{ success: true, db: "connected" }`
- [x] JWT test: geçersiz token ile istek → 401 dönmeli
- [x] Role test: viewer token ile admin endpoint → 403 dönmeli
- [x] Her model için unit test: en az 1 SELECT sorgusu çalışmalı
- [x] Error handler: olmayan route → `{ success: false, error: { code, message } }`
- [x] Request logger: istek sonrası api_logs tablosunda kayıt var mı

### Geçiş Onayı
Sunucu çalışıyor + DB bağlantısı OK + JWT çalışıyor + tüm modeller sorgu döndürüyor → Faz 3'e geç

---

## Faz 3 — Import: Parser + Previewer + Validator

### Yapılacaklar
- [x] `importer/config/` — 11 kaynak için mapping dosyaları:
  - ga4TrafficMapping.js
  - ga4ItemsMapping.js
  - metaAdsMapping.js
  - metaBreakdownsMapping.js
  - googleAdsMapping.js
  - ordersMapping.js
  - orderItemsMapping.js
  - productsMapping.js
  - customersMapping.js
  - campaignsMapping.js
  - channelMappingMapping.js
- [x] `importer/parsers/csvParser.js` — csv-parse ile satır satır oku
- [x] `importer/parsers/xlsxParser.js` — xlsx ile sheet oku
- [x] `importer/parsers/jsonParser.js` — JSON.parse + array doğrulama
- [x] `importer/previewer.js` — ilk 10 satırı oku, DB'ye yazma
- [x] `importer/validator.js` — tip kontrolü + zorunlu alan kontrolü

### Test Kriterleri
- [x] CSV parser: ga4_traffic.csv → 46.317 satır parse edilmeli
- [x] XLSX parser: products.xlsx oluştur → doğru satır sayısı
- [x] JSON parser: orders.json oluştur → doğru parse
- [x] Parser hata: bozuk CSV → anlamlı hata mesajı
- [x] Previewer: ga4_traffic.csv → ilk 10 satır, DB'de yeni kayıt YOK
- [x] Validator zorunlu alan: date eksik GA4 satırı → hata raporu
- [x] Validator tip: impressions alanına "abc" → hata raporu
- [x] Validator geçerli: doğru veri → hata yok

### Geçiş Onayı
3 format parse ediliyor + previewer DB'ye yazmıyor + validator hataları doğru yakalıyor → Faz 4'e geç

---

## Faz 4 — Import: Transformer + Mapper + Importer

### Yapılacaklar
- [x] `importer/transformer.js` — dönüşüm kuralları:
  - GA4 date: `20241001` (int) → `2024-10-01` (DATE)
  - Meta CTR: `2.25` → `0.0225` (÷100)
  - Google cost_micros: `2800000000` → `2800.00` (÷1.000.000)
  - Google avg_cpc: mikro → TL
  - camelCase → snake_case (GA4)
  - Noktalı sütun adları → snake_case (Google Ads)
  - Meta action: prefix temizleme
- [x] `importer/mapper.js` — config'den oku, sütun adı eşle
- [x] `importer/duplicateChecker.js` — bu tarih aralığı daha önce yüklendi mi
- [x] `importer/importer.js`:
  - Raw tabloya yaz
  - Transformer çalıştır
  - Clean tabloya yaz
  - Hatalı satırları import_errors'a yaz
  - imports tablosunu güncelle
  - KPI hesaplamayı tetikle

### Test Kriterleri
- [x] Transformer GA4: `20241001` → `2024-10-01` doğrulama
- [x] Transformer Meta CTR: `2.25` → `0.0225` doğrulama
- [x] Transformer Google: `2800000000` → `2800.00` doğrulama
- [x] Mapper GA4: `sessionSource` → `session_source` doğrulama
- [x] Mapper Google: `segments.date` → `date` doğrulama
- [x] Duplicate checker: aynı dosyayı iki kez yükle → uyarı ver
- [x] Importer: ga4_traffic.csv yükle → raw_ga4_traffic satır sayısı = ga4_traffic satır sayısı
- [x] Importer: bozuk satır → import_errors'a yazıldı mı
- [x] Importer rollback: DB yazma sırasında hata → hiçbir şey yazılmamış olmalı
- [x] imports tablosu: status, total_rows, error_rows doğru güncellendi mi

### Geçiş Onayı
Tüm dönüşümler doğrulandı + raw ve clean tablolar eşleşiyor + rollback çalışıyor → Faz 5'e geç

---

## Faz 5 — KPI Motoru: Traffic + Ads + Sales

### Yapılacaklar
- [x] `kpi/formulas.js` — tüm kritik formüller:
  - `weightedAvg(rows, valueField, weightField)` — bounce_rate, pages_per_session, avg_session_duration
  - `roas(revenue, spend)` — spend=0 ise null döner
  - `growthRate(current, previous)` — previous=0 ise null
  - `conversionRate(orders, sessions)`
  - `cohortRetentionRate(active, total)`
- [x] `kpi/traffic.js` — kpi_daily_traffic hesaplama:
  - SUM sessions, users, new_users, conversions
  - weighted avg bounce_rate, pages_per_session, avg_session_duration
  - revenue_per_user = purchase_revenue / total_users
  - traffic_growth_rate önceki günle karşılaştırma
- [x] `kpi/ads.js` — kpi_daily_ads hesaplama:
  - Meta + Google birleştir (UNION ALL)
  - ROAS: gelir orders tablosundan (campaign_name join)
  - spend_growth_rate, roas_growth_rate
  - frequency: sadece Meta (Google NULL)
- [x] `kpi/sales.js` — kpi_daily_sales hesaplama:
  - orders + order_items join
  - new_customer_revenue vs returning_customer_revenue
  - repeat_purchase_rate, refund_rate, revenue_growth_rate

### Test Kriterleri
- [x] formulas.js: weightedAvg testi — 1000 session %30 + 10 session %90 → ~%30.6
- [x] formulas.js: roas(0 spend) → null, roas(1000, 100) → 10.0
- [x] formulas.js: growthRate(120, 100) → 0.2
- [x] traffic.js: bounce_rate weighted avg mı basit avg mı? → weighted olmalı
- [x] ads.js: ROAS hesabında pixel_purchase_value kullanılmıyor mu → orders tablosundan geliyor
- [x] ads.js: Google frequency → NULL
- [x] sales.js: new + returning revenue toplamı = net_revenue mi
- [x] Tüm KPI tablolarına veri yazıldı mı (kpi_daily_* SELECT)

### Geçiş Onayı
Tüm formüller test edildi + ROAS kuralı doğrulandı + KPI tablolarında veri var → Faz 6'ya geç

---

## Faz 6 — KPI Motoru: Channel + Campaign + Product + Cohort

### Yapılacaklar
- [x] `kpi/channel.js` — agg_channel_performance:
  - GA4 attribution: orders.channel = ga4_traffic.session_default_channel_group
  - revenue, sessions, orders, spend, roas, conversion_rate, revenue_per_user
- [x] `kpi/campaign.js` — agg_campaign_performance:
  - campaign_name join: orders + meta_ads + google_ads
  - spend Meta + Google toplamı
  - revenue orders tablosundan
- [x] `kpi/product.js` — agg_product_performance:
  - ga4_item_interactions + order_items JOIN item_id üzerinden
  - UYARI: ga4_item_interactions ve ga4_traffic AYNI SORGUDA birleştirilemez
  - purchase_rate = items_purchased / items_viewed
- [x] `kpi/cohort.js` — agg_cohort_retention:
  - customers.first_order_date → cohort_month belirleme
  - Her offset_month için active_customers ve retention_rate
  - AY BAZLI çalışır, gün bazlı değil

### Test Kriterleri
- [x] channel.js: Paid Social kanalının geliri orders tablosundan mı geliyor
- [x] channel.js: organic kanalda ROAS → NULL (spend=0)
- [x] campaign.js: bir kampanyanın spend'i meta + google toplamı mı
- [x] campaign.js: ROAS = orders.net_revenue / (meta+google spend)
- [x] product.js: ga4_traffic ile JOIN yapılmıyor mu — kontrol et
- [x] product.js: purchase_rate = items_purchased / items_viewed
- [x] cohort.js: offset=0'da retention_rate = 1.0 (tüm müşteriler aktif)
- [x] cohort.js: ay bazlı gruplama doğru mu (YYYY-MM formatı)
- [x] Tüm agg tablolarında veri var mı

### Geçiş Onayı
4 aggregation tablosu doğru veriyle dolu + GA4 kısıtı ihlal edilmemiş + cohort ay bazlı → Faz 7'ye geç

---

## Faz 7 — REST API: Auth + Import Endpoint'leri

### Yapılacaklar
- [x] `routes/v1/auth.js` + `controllers/authController.js`:
  - POST /api/v1/auth/login → JWT üret
  - POST /api/v1/auth/logout
  - GET  /api/v1/auth/me
- [x] `routes/v1/imports.js` + `controllers/importController.js`:
  - POST   /api/v1/imports → dosya yükle (multer)
  - GET    /api/v1/imports → import geçmişi
  - GET    /api/v1/imports/:id → detay
  - GET    /api/v1/imports/:id/preview → önizleme
  - POST   /api/v1/imports/:id/map-columns → kolon eşleme kaydet
  - POST   /api/v1/imports/:id/validate → doğrula
  - POST   /api/v1/imports/:id/commit → DB'ye yaz + KPI tetikle
  - GET    /api/v1/imports/:id/errors → hatalı satırlar
  - DELETE /api/v1/imports/:id → rollback
- [x] `routes/v1/mappings.js` + `controllers/mappingController.js`:
  - GET    /api/v1/mappings/channels
  - POST   /api/v1/mappings/channels
  - PUT    /api/v1/mappings/channels/:source/:medium
  - DELETE /api/v1/mappings/channels/:source/:medium
- [x] Tüm endpoint'lere swagger-jsdoc yorumları ekle

### Test Kriterleri
- [x] Auth: geçerli login → JWT token dönüyor
- [x] Auth: yanlış şifre → 401
- [x] Auth: token olmadan import endpoint → 401
- [x] Auth: viewer token ile commit → 403
- [x] Import upload: campaigns.csv yükle → import kaydı oluştu
- [x] Import preview: ilk 10 satır dönüyor, DB'de yeni kayıt YOK
- [x] Import commit: tüm akış çalışıyor → status: committed
- [x] Import rollback: commit sonrası delete → veri silindi
- [x] Import errors: hatalı satır varsa listesi dönüyor
- [x] Swagger: /api/v1/docs → UI açılıyor, tüm endpoint'ler görünüyor

### Geçiş Onayı
Auth çalışıyor + import akışı uçtan uca test edildi + Swagger dokümante edildi → Faz 8'e geç

---

## Faz 8 — REST API: KPI + Dashboard + Diğer Endpoint'ler

### Yapılacaklar
- [x] `routes/v1/kpi.js` + `controllers/kpiController.js`:
  - POST /api/v1/kpi/run → KPI yeniden hesapla
  - GET  /api/v1/kpi/summary → özet metrikler
- [x] `routes/v1/dashboard.js` + `controllers/dashboardController.js`:
  - GET /api/v1/dashboard/trend → zaman serisi
  - GET /api/v1/dashboard/channel-performance
  - GET /api/v1/dashboard/platform-performance
  - GET /api/v1/dashboard/campaign-performance
  - GET /api/v1/dashboard/funnel
- [x] `routes/v1/filters.js` → filtre seçenekleri
- [x] `routes/v1/views.js` → saved_views CRUD
- [x] `routes/v1/segments.js` → segments CRUD
- [x] `routes/v1/export.js` → JSON export
- [x] `routes/v1/logs.js` → audit_logs + api_logs listeleme
- [x] `routes/v1/normalize.js` → POST /api/v1/normalize/run
- [x] Tüm endpoint'lere Swagger yorumları
- [x] Tarih aralığı, kanal, kampanya filtrelerini tüm endpoint'lere ekle

### Test Kriterleri
- [x] KPI run: tetikleme sonrası kpi_daily_* tablolarında yeni veri var mı
- [x] Dashboard trend: tarih aralığı filtresi çalışıyor mu
- [x] Dashboard channel: kanal filtresiyle doğru veri dönüyor mu
- [x] Dashboard funnel: 6 adım sıralı dönüyor mu
- [x] Filters: kanal listesi orders tablosundan geliyor mu
- [x] Views: oluştur → kaydet → getir → sil döngüsü
- [x] Segments: rules JSON doğru kaydediliyor mu
- [x] Export: JSON formatında doğru veri
- [x] Logs: audit_logs'ta son işlemler görünüyor
- [x] Swagger: tüm endpoint'ler dokümante edildi mi

### Geçiş Onayı
Tüm endpoint'ler çalışıyor + filtreler doğru + Swagger tam → Faz 9'a geç ✅

---

## Faz 9 — Frontend Kurulum + Routing

### Yapılacaklar
- [ ] `create-react-app` veya Vite ile React projesi kur
- [ ] Tailwind CSS kur ve yapılandır
- [ ] react-router-dom kur — 13 sayfa için route yapısı
- [ ] react-chartjs-2 + chart.js kur
- [ ] chartjs-chart-funnel plugin kur
- [ ] chartjs-chart-matrix plugin kur
- [ ] @tanstack/react-table kur
- [ ] react-grid-layout kur
- [ ] `frontend/src/services/api.js` — axios base config + interceptor
  - Base URL: `REACT_APP_API_URL`
  - Request interceptor: JWT token header'a ekle
  - Response interceptor: 401 → login'e yönlendir
- [ ] `frontend/src/components/layout/` — Sidebar, Header, PageWrapper
- [ ] Login sayfası — JWT al, localStorage'a kaydet
- [ ] Protected route — token yoksa login'e yönlendir
- [ ] 13 sayfa için boş route'lar — placeholder içerik

### Test Kriterleri
- [ ] `npm start` → uygulama açılıyor, hata yok
- [ ] Login: doğru bilgi → dashboard'a yönleniyor
- [ ] Login: yanlış bilgi → hata mesajı
- [ ] Protected route: login olmadan dashboard → login'e yönleniyor
- [ ] 13 sayfa: her route'a git → boş ama açılıyor
- [ ] Sidebar: tüm linkler çalışıyor
- [ ] api.js: backend'e istek → token header'da mı
- [ ] api.js: 401 gelince → otomatik login'e yönleniyor mu
- [ ] Responsive: mobil görünümde sidebar kapanıyor mu

### Geçiş Onayı
Routing çalışıyor + auth akışı tam + tüm sayfalar açılıyor → Faz 10'a geç

---

## Faz 10 — Frontend: Filtre Sistemi

### Yapılacaklar
- [ ] `hooks/useFilters.js` — React Context ile global filtre state:
  - dateFrom, dateTo (varsayılan: son 30 gün)
  - channel, campaign, device, city
  - Gelişmiş: revenueMin/Max, roas Min/Max
- [ ] `hooks/useUrlSync.js` — filtreler URL'e yaz, URL'den oku:
  - `?date_from=2024-10-01&channel=Paid+Social`
  - Sayfa yenilenince filtreler kaybolmaz
- [ ] `components/filters/DateRangePicker.jsx`
- [ ] `components/filters/ChannelFilter.jsx`
- [ ] `components/filters/CampaignFilter.jsx`
- [ ] `components/filters/DeviceFilter.jsx`
- [ ] `components/filters/CityFilter.jsx`
- [ ] `components/filters/AdvancedFilters.jsx`
- [ ] `components/filters/FilterPanel.jsx` — tüm filtreleri bir arada
- [ ] Cross-filter: grafikteki kanala tıklayınca filtre güncellenmeli

### Test Kriterleri
- [ ] Tarih seçimi → URL güncelleniyor mu
- [ ] URL ile direkt aç → filtreler yükleniyor mu
- [ ] Kanal filtresi → dashboard verisi güncelleniyor mu
- [ ] Cross-filter: grafikteki bar'a tıkla → filtre güncellendi, diğer bileşenler güncellendi
- [ ] Filtre sıfırla → varsayılan değerlere dönüyor
- [ ] Sayfalar arası geçiş → filtreler korunuyor mu
- [ ] Mobil: filtre paneli açılıp kapanıyor mu

### Geçiş Onayı
Global filtre çalışıyor + URL senkron + cross-filter test edildi → Faz 11'e geç

---

## Faz 11 — Frontend: Dashboard Ana Sayfa

### Yapılacaklar
- [ ] `components/kpi/KpiCard.jsx` — değer, başlık, trend ok
- [ ] `components/kpi/KpiGrid.jsx` — responsive kart grid
- [ ] `components/charts/LineChart.jsx` — zaman serisi
- [ ] `components/charts/BarChart.jsx`
- [ ] `components/charts/DonutChart.jsx`
- [ ] `components/charts/ScatterChart.jsx`
- [ ] `components/tables/DataTable.jsx` — sıralama, sayfalama
- [ ] `components/tables/PivotTable.jsx` — @tanstack/react-table
- [ ] `pages/Dashboard/index.jsx`:
  - react-grid-layout ile drag-drop grid
  - KPI kartları (8 trafik + 10 reklam + 8 satış = özet)
  - Zaman serisi grafik — ciro trendi
  - Donut chart — kanal dağılımı
  - Bar chart — kampanya karşılaştırma
  - Scatter chart — ROAS vs spend
  - Filtre paneli entegrasyonu
- [ ] Saved views: layout kaydet/yükle → `saved_views` tablosuna

### Test Kriterleri
- [ ] KPI kartları: gerçek veri gösteriyor mu
- [ ] KPI trend: büyüme oku doğru yönde mi (yeşil/kırmızı)
- [ ] Drag-drop: widget'ları taşı → layout kaydedildi mi
- [ ] Saved view: kaydet → yenile → aynı layout yüklendi mi
- [ ] Zaman serisi: tarih filtresi → grafik güncelleniyor mu
- [ ] Donut: kanala tıkla → cross-filter çalışıyor mu
- [ ] Responsive: tablet ve mobilde görünüm bozulmuyor mu
- [ ] Boş veri: veri yoksa "veri bulunamadı" gösteriyor mu

### Geçiş Onayı
Dashboard tam çalışıyor + drag-drop + saved views + tüm grafikler veri gösteriyor → Faz 12'ye geç

---

## Faz 12 — Frontend: Analitik Sayfalar

### Yapılacaklar
- [ ] `components/charts/FunnelChart.jsx` — chartjs-chart-funnel
- [ ] `components/charts/HeatmapChart.jsx` — chartjs-chart-matrix
- [ ] `pages/Channels/` — kanal bazlı ciro, dönüşüm, ROAS karşılaştırma
- [ ] `pages/Campaigns/` — kampanya harcama vs gelir, ROAS sıralaması
- [ ] `pages/Traffic/` — trafik kaynakları, bounce rate, session süresi
- [ ] `pages/Funnel/` — 6 adımlı huni: listede gör → satın al
- [ ] `pages/Cohort/` — cohort retention heatmap, ay bazlı tablo

### Test Kriterleri
- [ ] Channels: kanal filtresi → tek kanal detayı
- [ ] Channels: ROAS organic → NULL gösterim (hata değil)
- [ ] Campaigns: Meta vs Google karşılaştırması yan yana
- [ ] Traffic: bounce_rate weighted avg mı doğru hesaplanıyor
- [ ] Funnel: 6 adım sıralı, her adım bir öncekinden küçük veya eşit
- [ ] Funnel: tıklama oranları doğru hesaplanıyor mu
- [ ] Cohort: offset=0'da retention %100
- [ ] Cohort: heatmap renklendirmesi retention_rate'e göre
- [ ] Tüm sayfalar filtre sistemiyle entegre mi

### Geçiş Onayı
5 analitik sayfa tam çalışıyor + grafikler doğru + filtreler entegre → Faz 13'e geç

---

## Faz 13 — Frontend: Sistem Sayfaları

### Yapılacaklar
- [ ] `pages/Import/` — import akışı UI:
  - Dosya yükle (drag-drop)
  - Önizleme tablosu
  - Kolon eşleme ekranı
  - Doğrulama sonuçları
  - Hatalı satırlar raporu
  - Import geçmişi listesi
- [ ] `pages/Segments/` — segment oluştur, önizle, uygula
- [ ] `pages/Views/` — kaydedilmiş dashboard görünümleri
- [ ] `pages/Export/` — JSON/CSV export butonları
- [ ] `pages/Logs/` — audit_logs ve api_logs tabloları
- [ ] `pages/Filters/` — kayıtlı filtre kombinasyonları
- [ ] `pages/Settings/` — kullanıcı tercihleri

### Test Kriterleri
- [ ] Import: ga4_traffic.csv yükle → önizle → eşle → commit → dashboard güncelle
- [ ] Import: hatalı satır varsa rapor göster, commit yine de çalışsın
- [ ] Import: aynı dosyayı iki kez yükle → duplicate uyarısı
- [ ] Segments: kural oluştur → önizle → kaydet
- [ ] Views: dashboard'dan kaydet → Views sayfasında görünsün → yükle
- [ ] Export: JSON indir → veri doğru mu
- [ ] Logs: son import işlemi görünüyor mu
- [ ] Settings: tercihler kaydediliyor mu

### Geçiş Onayı
Tüm sistem sayfaları çalışıyor + import akışı uçtan uca test edildi → Faz 14'e geç

---

## Faz 14 — Uçtan Uca Test + Final

### Yapılacaklar
- [ ] Tam kullanıcı senaryosu testi:
  1. Login → Dashboard aç
  2. Filtre uygula → tarih aralığı, kanal seç
  3. Import → CSV yükle → eşle → commit
  4. KPI tabloları güncellendi mi kontrol et
  5. Dashboard'a dön → yeni veri gösteriliyor mu
  6. Segment oluştur → uygula
  7. View kaydet → çıkış yap → giriş → view yükle
  8. Export → JSON indir → veri doğru mu
- [ ] Hata senaryoları testi:
  - Bozuk CSV yükle → hata mesajı anlaşılır mı
  - Geçersiz token → 401 dönüyor mu
  - Boş veri aralığı → "veri bulunamadı" gösteriyor mu
  - Ağ hatası → frontend çöküyor mu (graceful error)
- [ ] Responsive test: mobil, tablet, desktop
- [ ] process.md'yi final durumla güncelle
- [ ] docs/ dosyalarını gözden geçir — güncel mi

### Test Kriterleri
- [ ] Tüm kullanıcı senaryoları hatasız tamamlandı
- [ ] Hiçbir kritik hata konsol'da görünmüyor
- [ ] Tüm KPI değerleri manuel hesaplamayla eşleşiyor
- [ ] ROAS hiçbir yerde pixel değeri kullanmıyor
- [ ] Bounce rate weighted avg ile hesaplanıyor
- [ ] process.md güncel
- [ ] roadmap.md'deki tüm checkbox'lar işaretli

### Tamamlanma Kriteri
Tüm test senaryoları geçti + dokümantasyon güncel → Proje tamamlandı

