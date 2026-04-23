# Sporthink KPI Dashboard — Proje Analiz Raporu

**Hazırlanma Tarihi:** 2026-04-22  
**Proje Durumu:** Faz 7/14 tamamlandı (Backend hazır, Frontend henüz kurulmadı)

---

## İçindekiler

1. [Projenin Amacı ve İş Problemi](#1-projenin-amacı-ve-iş-problemi)
2. [Teknoloji Stack'i ve Gerekçeleri](#2-teknoloji-stacki-ve-gerekçeleri)
3. [Mimari Yapı](#3-mimari-yapı)
4. [Veritabanı Tasarımı](#4-veritabanı-tasarımı)
5. [Veri Akışı (Data Pipeline)](#5-veri-akışı-data-pipeline)
6. [KPI Hesaplama Mantığı](#6-kpi-hesaplama-mantığı)
7. [API Yapısı](#7-api-yapısı)
8. [Frontend Yapısı](#8-frontend-yapısı)
9. [Güvenlik Önlemleri](#9-güvenlik-önlemleri)
10. [Cache Stratejisi](#10-cache-stratejisi)
11. [Bilinen Eksiklikler ve İyileştirme Alanları](#11-bilinen-eksiklikler-ve-iyileştirme-alanları)
12. [Sorulabilecek Zor Sorular ve Cevapları](#12-sorulabilecek-zor-sorular-ve-cevapları)

---

## 1. Projenin Amacı ve İş Problemi

### Ne çözüyor?

Sporthink, birden fazla reklam platformundan (Meta Ads, Google Ads), trafik analitik aracından (GA4) ve kendi e-ticaret sisteminden veri toplayan bir şirkettir. Bu veriler ayrı platformlarda yaşadığında üç temel sorun oluşur:

**Sorun 1 — Veri Çelişkisi:** Meta Ads, bir kampanya için 50.000 TL gelir bildirirken GA4 aynı kampanya için 35.000 TL gösterebilir. Hangisi doğru? Şirket hangi rakamı kararlarına esas almalı?

**Sorun 2 — Görünürlük Eksikliği:** "Bu ay paid social kanalı mı daha iyi performans gösterdi yoksa organik mi?" sorusunu cevaplamak için birinin Meta Ads'e, birinin GA4'e, birinin de e-ticaret sistemine bakması gerekiyor. Sonra excel'de birleştiriyorlar.

**Sorun 3 — Geç Karar:** Veriyi birleştirmek saatler aldığında karar da geç geliyor. Günlük optimizasyon yerine haftalık toplantılarla strateji güncelleniyor.

**Bu proje bu üç sorunu çözüyor:** Tüm verileri tek pipeline üzerinden sisteme alıyor, çelişkiyi kural bazlı çözüyor (GA4 attribution birincil kaynak), hesaplanmış KPI'ları ön-hesaplayarak depolüyor ve tek ekranda drill-down yapılabilir bir dashboard sunuyor.

### Hedef Kullanıcı

| Rol | Ne yapıyor? | Hangi kararları destekliyor? |
|---|---|---|
| **Admin** | Sistemi yönetir, veri yükler, kullanıcı yönetimi | Tüm kararlar |
| **Pazarlama Yetkilisi** | Veri yükler, KPI raporlarını okur, segmentler oluşturur | Bütçe dağılımı, kampanya optimizasyonu, kanal tercihi |
| **Viewer** | Sadece okur | Yönetim raporlama toplantıları |

### Hangi iş kararlarını destekliyor?

- "Meta'ya mı yoksa Google'a mı daha fazla bütçe ayıralım?" (ROAS karşılaştırma)
- "Hangi kanal en iyi müşteri kalitesini getiriyor?" (cohort retention × kanal)
- "Bu kampanya kârlı mı, kesmeli miyiz?" (ROAS < 1 = zarar)
- "Hangi ürünler sepete ekleniyor ama satın alınmıyor?" (ürün funnel analizi)
- "Yeni müşteri edinme maliyeti nasıl değişiyor?" (kpi_daily_sales: new_customer_revenue)

---

## 2. Teknoloji Stack'i ve Gerekçeleri

### Backend

| Teknoloji | Neden seçildi | Alternatifler | Neden tercih edilmedi |
|---|---|---|---|
| **Node.js** | Async I/O — CSV parse + DB yazma gibi yoğun I/O işlemleri için ideal. Aynı dil frontend ve backend'de | Python (Django/Flask), Go | Python: veri bilimi için güçlü ama REST API ekosistemi daha ağır. Go: compile süreçleri prototiplemeyi yavaşlatır |
| **Express.js** | Minimal, esnek, geniş middleware ekosistemi. Sporthink gibi özel iş kuralı yoğun projeler için fazladan sınırlama yok | NestJS, Fastify, Koa | NestJS: opinionated yapısı basit projeye overhead katar. Fastify: ekosistem Express kadar geniş değil |
| **MySQL 8.0** | İlişkisel veri — kampanya adı tüm tablolar arası join key, FK kısıtları kritik. WINDOW FUNCTION (PERIOD_DIFF, cohort) desteği | PostgreSQL, MongoDB, ClickHouse | PostgreSQL: fonksiyon seti benzer, seçim bağlama göre değişebilir. MongoDB: şemasız yapı FK kısıtlarını imkânsız kılar — bu projedeki veri tutarlılığı ihtiyacını karşılamaz. ClickHouse: OLAP için ideal ama relational CRUD desteği zayıf |
| **mysql2** | Native Promise desteği, async/await uyumlu, connection pool | Sequelize, TypeORM, Knex | Sequelize: bağımlılıkları (validator vb.) 100+ dosya yüklüyor, macOS'ta soğuk başlatma 5+ dakika alıyordu — proje kararıyla tamamen kaldırıldı. TypeORM: daha çok TypeScript projeleri için. Knex: query builder yeterli ama plain SQL daha okunabilir |
| **JWT (jsonwebtoken)** | Stateless auth — sunucuda session saklamaya gerek yok, horizontal scaling kolaylaşır | Session + Cookie, OAuth2 | Session: sunucu durumu gerektirir, çok sunucuda sorun çıkar. OAuth2: bu boyutta gereksiz karmaşıklık |
| **bcryptjs** | Endüstri standardı parola hash algoritması, pure JS (native addon gerekmez) | argon2, scrypt | argon2: daha modern ama bcrypt'in battle-tested ekosistemi yeterli |
| **multer** | Express için standart multipart/form-data middleware, disk ve memory storage desteği | formidable, busboy | multer: Express ile en yaygın entegrasyon, geniş dokümantasyon |
| **csv-parse** | Streaming desteği, BOM temizleme (UTF-8 BOM problemi vardı), büyük dosyalar için güvenli | papaparse, fast-csv | papaparse: tarayıcı ağırlıklı. fast-csv: benzer, csv-parse daha esnek konfigürasyon sunuyor |
| **swagger-jsdoc + swagger-ui-express** | Koddan dokümantasyon üretimi — manuel yönetim gereksiz, controller'daki JSDoc yorum değişince spec otomatik güncellenir | Postman collection, manuel README | Manuel: bakım yükü, kolayca eskiyor |
| **helmet** | Tek satırda 11 güvenlik header'ı (X-Frame-Options, CSP, HSTS vb.) | Manuel header ayarlama | Manuel: gözden kaçma riski yüksek |

### Frontend (Planlanmış — Faz 9-14)

| Teknoloji | Neden seçildi | Alternatif |
|---|---|---|
| **React** | Component bazlı yapı filtreleme+grafik kombinasyonu için ideal. Geniş ekosistem | Vue, Angular, Svelte |
| **Tailwind CSS** | Utility-first — hızlı prototipleme, custom design token, global CSS kalabalığı yok | Bootstrap, MUI, styled-components |
| **react-chartjs-2** | Chart.js React wrapper, funnel ve matrix eklentileri mevcut | Recharts, Nivo, D3 |
| **@tanstack/react-table** | Headless pivot tablo — kendi UI'ını getiriyorsun, tam kontrol | AG Grid (paid), react-table v7 |
| **react-grid-layout** | Drag-drop dashboard layout, kayıt edilebilir grid pozisyonları | GridStack, Gridster |
| **React Context** | Global filtre state için yeterli — Redux overhead'i gereksiz | Redux, Zustand, Jotai |

---

## 3. Mimari Yapı

### Katmanlı Mimari

```
HTTP İsteği
    ↓
Middleware Katmanı
  ├── helmet (güvenlik headers)
  ├── cors
  ├── express.json (body parse)
  ├── requestLogger (api_logs'a kayıt)
  ├── verifyToken (JWT doğrulama)
  └── requireRole (rol kontrolü)
    ↓
Route Katmanı (routes/v1/)
  └── Sadece HTTP → Controller yönlendirmesi
    ↓
Controller Katmanı (controllers/)
  └── İş mantığı: iş kuralları, doğrulama, orkestrasyon
    ↓
Model Katmanı (models/)
  └── Sadece SQL sorguları — veriyi al veya yaz
    ↓
MySQL (pool)
```

**Neden bu ayrım?**
- Route: endpoint tanımı + middleware atama. İş mantığı yok.
- Controller: "commit isteği geldi, önce duplicate var mı bak, sonra parse et, sonra runImport çağır" gibi orkestrasyon.
- Model: "imports tablosundan id=X kaydını getir" gibi tek sorumluluk. Controller'da ham SQL yazılmaz.

### Dosya/Klasör Yapısı Mantığı

```
backend/src/
├── config/       ← Altyapı: DB bağlantısı, env yönetimi
├── middleware/   ← Cross-cutting concerns: auth, logging, hata yönetimi
├── models/       ← Veri erişim katmanı — sadece SQL
├── controllers/  ← İş mantığı
├── routes/v1/    ← HTTP endpoint tanımları
├── importer/     ← Import pipeline'ı — kendi alt sistemi
│   ├── config/   ← 11 kaynak için mapping konfigürasyonları
│   └── parsers/  ← Dosya formatı okuyucular
├── kpi/          ← KPI hesaplama motoru — kendi alt sistemi
└── utils/        ← Yardımcı fonksiyonlar
```

`importer/` ve `kpi/` kasıtlı olarak izole alt sistemler olarak tasarlandı. Her ikisi de birbirinden bağımsız test edilebilir, birbirlerini import etmiyor. Controller bu iki sistemi orkestre ediyor.

### SOLID Prensipleri

**Single Responsibility — Uygulandı:**
- `formulas.js`: Sadece matematiksel formüller. Dashboard, export, API'yi bilmiyor.
- `duplicateChecker.js`: Sadece tarih aralığı çakışması kontrolü. Dosya parse etmiyor, DB'ye yazmıyor.
- `transformer.js`: Sadece veri dönüşüm kuralları (GA4 date int→DATE, Meta CTR÷100 vb.)

**Open/Closed — Kısmen uygulandı:**
- Yeni kaynak eklemek için `importer/config/` altına yeni bir mapping dosyası eklemek yeterli. `importer.js`, `validator.js`, `transformer.js` değişmiyor. 11 kaynak bu şekilde eklendi.
- KPI motoru genişletilebilir: `runner.js`'e yeni modül eklemek mevcut modülleri bozmaz.

**Dependency Inversion — Kısmen:**
- Controller'lar model fonksiyonlarına doğrudan bağlı (interface yok). Node.js ekosisteminde interface yazmak yaygın değil, pragmatik bir tercih.

**Interface Segregation — Uygulandı:**
- `auth.js` middleware iki fonksiyon export ediyor: `verifyToken` ve `requireRole`. Her route ihtiyacı kadar alıyor.

### Clean Architecture Nerede Sağlandı?

- `kpi/` katmanı DB'yi `pool` aracılığıyla kullanıyor ama HTTP katmanından tamamen habersiz. Test script'i `runner.js`'i direkt çağırabilir.
- `importer/` pipeline adımları birbirini zincirlemiyor, `importer.js` hepsini koordine ediyor.
- Response formatı (`utils/formatters.js`) tüm controller'larda aynı. Frontend format değişikliğine tek dosyadan uyarlanıyor.

---

## 4. Veritabanı Tasarımı

### 32 Tablo, 8 Grup

#### Grup 1 — Master (Referans) Tablolar
| Tablo | PK | Satır | Açıklama |
|---|---|---|---|
| `users` | id (auto) | — | Sistem kullanıcıları (admin, marketing, viewer) |
| `products` | sku (VARCHAR) | 402 | Ürün kataloğu |
| `customers` | customer_id (VARCHAR) | 5.000 | Müşteri master |
| `campaigns` | campaign_name (VARCHAR) | 19 | Meta+Google kampanya master |
| `channel_mapping` | source + medium (composite PK) | 16 | GA4 kanal normalizasyonu |

`channel_mapping` bileşik PK kullanıyor çünkü doğal kimlik source+medium çifti. Auto-increment eklenmedi — gereksiz bir sütun olurdu ve route'lar `/source/medium` parametresiyle çalışıyor.

#### Grup 2 — E-ticaret Tabloları
| Tablo | PK | FK | Satır |
|---|---|---|---|
| `orders` | order_id (VARCHAR) | customer_id (HARD), campaign_name (SOFT-nullable), source+medium (SOFT) | 14.299 |
| `order_items` | order_id + line_id (composite) | order_id (HARD), item_id → products.sku (HARD) | 27.406 |

**Hard FK vs Soft FK nedir?**
- **Hard FK:** Veritabanı kısıtı olarak tanımlanmış. Referanssız kayıt insert edilemez (ERROR 1452).
- **Soft FK:** Kod seviyesinde kontrol, DB kısıtı değil. Uyarı üretir ama import devam eder. Örnek: `orders.campaign_name` — organik kanaldan gelen siparişlerde campaign_name NULL olabilir (ör: doğrudan arama).

#### Grup 3 — Ham (Raw) Katman — 5 Tablo
Tüm dış kaynaklardan gelen verinin ilk kopyası. Hiçbir dönüşüm yapılmadan, kaynak formatında saklanır.

| Tablo | Neden raw katman? | Dönüşüm |
|---|---|---|
| `raw_ga4_traffic` | GA4 date `20241001` (int), camelCase sütun adları | date→DATE, camelCase→snake_case |
| `raw_ga4_item_interactions` | Aynı GA4 sorunları | Aynı dönüşümler |
| `raw_meta_ads` | CTR yüzde (`2.25`), tüm metrikler VARCHAR | CTR÷100, sayısal tipler |
| `raw_meta_ads_breakdowns` | publisher_platform+impression_device kombinasyonları | Minimal |
| `raw_google_ads` | `cost_micros` mikro birim, noktalı sütun adları | ÷1.000.000, snake_case |

**Raw katmanın amacı:** Import hatalanırsa veya dönüşüm kuralı değişirse orijinal veriyi kaybetmeden yeniden işleyebilirsin. Ayrıca hangi verinin sistem tarafından üretildiği, hangisinin dış kaynaktan geldiği nettir.

#### Grup 4 — Temiz (Clean) Analitik Katman — 5 Tablo
`ga4_traffic`, `ga4_item_interactions`, `meta_ads`, `meta_ads_breakdowns`, `google_ads`

Dönüşümler uygulanmış hali. KPI hesaplamaları bu tabloları kullanır. Raw tablolarla birebir aynı kayıt sayısını içerirler.

#### Grup 5 — KPI Tabloları — Pre-Computed, Günlük Granülarite
| Tablo | Granülarite | Kaynaklar |
|---|---|---|
| `kpi_daily_traffic` | date + channel_group | ga4_traffic |
| `kpi_daily_ads` | date + platform + campaign_name | meta_ads + google_ads |
| `kpi_daily_sales` | date | orders + order_items |

#### Grup 6 — Aggregation Tabloları — Pre-Computed
| Tablo | PK | Satır Sayısı |
|---|---|---|
| `agg_channel_performance` | date + channel_group | 1.435 |
| `agg_campaign_performance` | date + campaign_name + platform | 2.056 |
| `agg_product_performance` | date + item_id | 29.710 |
| `agg_cohort_retention` | cohort_month + offset_month | 72 |

#### Grup 7 — Import Sistemi — 3 Tablo
`imports`, `import_column_mappings`, `import_errors`

#### Grup 8 — Sistem/Güvenlik — 5 Tablo
`audit_logs`, `api_logs`, `refresh_logs`, `saved_views`, `segments`

### Normalizasyon Seviyesi

**3NF (Third Normal Form) uygulandı** — çoğu tabloda:
- Her sütun PK'ya bağımlı, başka sütuna bağımlı değil.
- Tekrar eden gruplar yok.

**Kasıtlı denormalizasyon** yapılan yerler:
- `orders.channel`: Normalize edilse `channel_mapping`'den JOIN alınırdı. Denormalize tutuldu çünkü tüm KPI join'lerinin başlangıç noktası burası — her sorguda ek JOIN maliyeti önlendi.
- KPI tabloları tamamen denormalize: Ham verilerin hesaplanmış kopyaları. "Gerçek zamanlı hesapla" yerine "önceden hesapla, hızlı oku" kararı (detaylar bölüm 10'da).

### Index Yapısı (28 Index)

**4 UNIQUE Index — Duplicate Önleme:**
```sql
-- GA4 traffic: aynı gün/kanal/cihaz/şehir kombinasyonunun iki kez yüklenmesini engeller
uq_ga4_traffic: (date, session_source, session_medium, session_campaign_name(100),
                 device_category, city, new_vs_returning, landing_page(100))

-- Meta breakdown: publisher_platform + impression_device kombinasyonu
uq_meta_bd: (date, campaign_name(100), adset_name(100), ad_name(100),
             publisher_platform, platform_position, impression_device)
```

**VARCHAR prefix uzunlukları** (MySQL utf8mb4 kısıtı): utf8mb4'te her karakter 4 byte. InnoDB 3072-byte index limiti var. Uzun VARCHAR sütunlar index'te prefix ile kısaltıldı (`campaign_name(100)` = 400 byte).

**24 Performans Index:**
Tüm join key'leri üzerinde index var: `date`, `campaign_name`, `item_id`, `customer_id`, `channel`, `source+medium`. Dashboard sorguları filtresiz full scan yapmıyor.

### Foreign Key Kararları

| Karar | Neden |
|---|---|
| `orders.customer_id` → `customers` HARD FK | Müşterisiz sipariş veri bütünlüğünü bozar |
| `orders.campaign_name` → `campaigns` SOFT | Organik trafikte NULL gelebilir |
| `ga4_traffic.import_id` → `imports` HARD FK | Her ham satır hangi import'tan geldiği izlenebilmeli |
| `google_ads.product_item_id` → `products` SOFT | Search kampanyalarında product hedefleme yok, NULL gelir |

### Stored Procedure / Trigger

**Yok.** Tüm iş mantığı uygulama katmanında. Gerekçe: Test edilebilirlik ve taşınabilirlik. DB-level mantık test etmek daha zor, farklı MySQL sürümlerine taşınması riskli.

---

## 5. Veri Akışı (Data Pipeline)

### Adım Adım: CSV'den Dashboard'a

```
1. YÜKLEME (HTTP POST /api/v1/imports)
   ├── multer dosyayı uploads/ klasörüne geçici yazar
   ├── imports tablosuna kayıt oluştur (status: pending)
   ├── Dosyayı import_<id>.csv olarak yeniden adlandır
   └── importId döndür

2. ÖNİZLEME (GET /api/v1/imports/:id/preview)  [OPSİYONEL]
   ├── Dosyanın ilk 10 satırını parse et
   ├── Mapping config'den sütun eşleme önerisi oluştur
   ├── DB'ye HİÇBİR ŞEY YAZMA
   └── Kullanıcıya göster: "Bu mu doğru veri?"

3. SÜTUN EŞLEMESİ (POST /api/v1/imports/:id/map-columns)  [OPSİYONEL]
   ├── Kaynak tablo değiştirilebilir (yanlış seçildiyse)
   └── import_column_mappings'e kayıt yaz

4. DOĞRULAMA (POST /api/v1/imports/:id/validate)
   ├── Tüm dosyayı parse et (Infinity limit)
   ├── DuplicateChecker: Bu tarih aralığı daha önce yüklendi mi?
   ├── ValidateRows:
   │   ├── Zorunlu alan kontrolü (required: true sütunlar)
   │   ├── Tip kontrolü (date/int/decimal)
   │   └── Hard FK kontrolü (referans tablosu varlık kontrolü)
   └── Rapor döndür: validRows, errorRows, duplicate uyarısı

5. COMMİT (POST /api/v1/imports/:id/commit)
   ├── Tüm dosyayı parse et
   ├── runImport() çağır:
   │   ├── MySQL TRANSACTION başlat
   │   ├── Raw tabloya toplu INSERT (orijinal format)
   │   ├── Transformer: dönüşümleri uygula
   │   │   ├── GA4: 20241001 → 2024-10-01
   │   │   ├── Meta: CTR 2.25 → 0.0225
   │   │   └── Google: cost_micros 2.8M → 2.8
   │   ├── Mapper: CSV sütun adı → DB sütun adı
   │   ├── Clean tabloya toplu INSERT
   │   ├── Hatalı satırları import_errors'a yaz (devam et)
   │   ├── imports.status = committed
   │   └── TRANSACTION COMMIT
   ├── runAllKpi() arka planda tetikle (import'u bloklamaz)
   └── Sonuç: { successRows, errorRows, status }

6. KPI HESAPLAMA (Otomatik, arka plan)
   ├── kpi_daily_traffic TRUNCATE + yeniden hesapla
   ├── kpi_daily_ads TRUNCATE + yeniden hesapla
   ├── kpi_daily_sales TRUNCATE + yeniden hesapla
   ├── agg_channel_performance TRUNCATE + yeniden hesapla
   ├── agg_campaign_performance TRUNCATE + yeniden hesapla
   ├── agg_product_performance TRUNCATE + yeniden hesapla
   ├── agg_cohort_retention TRUNCATE + yeniden hesapla
   └── refresh_logs'a işlem süresi yaz

7. DASHBOARD OKUMA (GET /api/v1/dashboard/*)
   └── Pre-computed agg_* tablolarından okuma — hesaplama yok
```

### Chunk Mekanizması

Mevcut implementasyonda dosyalar tek seferde belleğe yükleniyor (`parseFile(filePath, Infinity)`). Chunk bölme henüz uygulanmadı — dummy veriyle çalışıldığında en büyük dosya 46.317 satır (GA4 traffic), bu bellek için sorun değil.

**Production için chunk stratejisi planı:** Dosyayı 1.000 satırlık bloklara böl, her blok için ayrı transaction çalıştır. Bir blok hatalanırsa yalnızca o blok geri alınır, başarılı bloklar korunur. Mevcut `importer.js` tek bir large transaction kullanıyor.

### Veri Doğrulama Katmanları

**Katman 1 — Header Doğrulama (validateHeaders):**
CSV'nin ilk satırı beklenen sütunları içeriyor mu? Eksik zorunlu başlık → import durdurulur.

**Katman 2 — Satır Doğrulama (validateRows):**
- `required: true` olan sütun boş mu?
- `type: 'int'` olan sütunda `"abc"` var mı?
- `type: 'decimal'` olan sütunda negatif değer var mı?

**Katman 3 — FK Doğrulama (fkChecks içinde):**
- Hard FK: `order_items.item_id` → `products.sku` var mı? (DB sorgusu)
- Soft FK: `orders.campaign_name` → `campaigns` var mı? (uyarı, devam et)

**Katman 4 — Duplicate Kontrolü (duplicateChecker.js):**
Tarih aralığı tespiti: dosyadaki en küçük ve en büyük tarih alınır, bu aralıkta zaten committed import var mı?

### Hata Satırı Raporu

Her hatalı satır `import_errors` tablosuna yazılır:
```
import_id | row_number | raw_data (JSON) | error_message | created_at
```
Import commit başarılı olsa da hatalı satırlar kayıt altında. `GET /api/v1/imports/:id/errors` endpoint'i sayfalı liste döndürür.

---

## 6. KPI Hesaplama Mantığı

### Merkezi Formüller (kpi/formulas.js)

Tüm matematiksel hesaplamalar tek dosyada toplanmış. Başka dosyada formül yazılmaz.

```javascript
// Ağırlıklı Ortalama
// Neden: Basit AVG 1 oturumlu kaynağa 10.000 oturumlu kaynak kadar ağırlık verir — yanıltıcı
weightedAvg(rows, valueField, weightField)
  → SUM(value × weight) / SUM(weight)

// ROAS
// Neden spend=0'da null: Organic kanalda spend yok, ROAS hesaplanamaz (0'a bölme)
roas(revenue, spend)
  → spend > 0 ? revenue / spend : null

// Büyüme Oranı
// Neden previous=0'da null: önceki dönem sıfırsa büyüme %sonsuz — anlamsız
growthRate(current, previous)
  → previous > 0 ? (current - previous) / previous : null

// Dönüşüm Oranı
conversionRate(orders, sessions) → orders / sessions

// Cohort Retention
cohortRetentionRate(active, total) → active / total
```

### KPI Tabloları ve İçerikleri

**kpi_daily_traffic** (1.638 satır):
```
Metrikler: sessions, total_users, new_users, engaged_sessions, conversions, purchase_revenue
Weighted avg: bounce_rate, pages_per_session, avg_session_duration, engagement_rate
Türetilen: revenue_per_user, traffic_growth_rate
```

**kpi_daily_ads** (2.056 satır):
```
Platformlar: Meta, Google (ayrı satırlar)
Metrikler: spend, impressions, clicks, ctr, cpc, cpm, frequency (Google=NULL)
Kritik: revenue = orders tablosundan (pixel değil)
Türetilen: roas, spend_growth_rate, roas_growth_rate
```

**kpi_daily_sales** (182 satır):
```
Metrikler: total_orders, total_revenue, net_revenue, avg_order_value
Segmentasyon: new_customer_revenue, returning_customer_revenue
Türetilen: repeat_purchase_rate, refund_rate, revenue_growth_rate
Kural: new_customer_revenue + returning_customer_revenue = net_revenue (her zaman)
```

### Pre-Computed vs On-Demand

**Bu proje pre-computed (önceden hesaplanmış) tercih eder.**

| Yaklaşım | Artı | Eksi | Bu projede |
|---|---|---|---|
| Pre-computed | Dashboard okuma = tek SELECT | Import sonrası hesaplama süresi | ✅ Kullanılıyor |
| On-demand | Her zaman güncel | Her dashboard açılışında büyük JOIN sorgusu | ❌ Yok |

**Neden pre-computed?**
Dashboard'da her filtre değişikliğinde 46.317 GA4 satırı + 28.873 Google satırı + 14.299 sipariş satırı üzerinde JOIN yapılması hem veritabanını hem de kullanıcıyı bekletir. `agg_channel_performance`'tan 1.435 satır okumak milisaniyeler alır. Hesaplama maliyeti dashboard görüntüleme sırasında değil, import sırasında ödeniyor.

### Attribution Kararı — Neden GA4?

**Sorun:** Meta Ads kampanyası "summer_sale_2024" için:
- Meta Ads paneli: 50.000 TL satış gösteriyor
- Google Analytics: 35.000 TL gösteriyor
- Sipariş tablosu: 38.000 TL gerçek gelir

**Neden Meta/Google'ın kendi rakamı kullanılmaz?**
Her platform kendi pixel'ini kullanır. Bir kullanıcı hem Meta hem Google reklamını görüp satın aldığında her ikisi de bu geliri "kendi" geliri olarak raporlar. Sonuç: reklam platformlarının toplam atfettiği gelir gerçek gelirin 2-3 katı olabilir.

**GA4 Neden Referans?**
GA4 last-click attribution kullanır ve her dönüşümü bir kez sayar. Her oturuma tek bir kaynak atfeder (session_source / session_medium). Bu yüzden:
- ROAS = `orders.net_revenue` / reklam harcaması (`meta_ads.spend` + `google_ads.cost_tl`)
- `meta_ads.pixel_purchase_value` ve `google_ads.conversions_value` hiçbir zaman kullanılmaz

Bu kural `CLAUDE.md`'de kırılmaz kural olarak tanımlanmış ve `kpi/ads.js`, `kpi/campaign.js` buna göre yazılmış.

### ROAS Hesaplamasında Çift Kaynak

```
spend kaynağı:  meta_ads.spend + google_ads.cost_tl
gelir kaynağı:  orders.net_revenue WHERE campaign_name = kampanya_adı
```

Yani harcama reklam platformlarından alınıyor (onlar ödemeyi biliyor), gelir e-ticaret sisteminden alınıyor (o ödemeyi biliyor). İkisi de kendi konusunda otorite.

### Cohort Retention — Teknik Detaylar

```
cohort_month = DATE_FORMAT(first_order_date, '%Y-%m')
offset_month = PERIOD_DIFF(DATE_FORMAT(order_date, '%Y%m'), DATE_FORMAT(first_order_date, '%Y%m'))

Örnek: 2024-10 cohortundaki müşteri Aralık 2024'te alışveriş yaptı
  → offset_month = 2

Kural: offset=0'da retention = 1.0 (TÜM müşteriler aktif, tanım gereği)
Önemli detay: total_customers, customers tablosundaki raw count değil
               orders tablosundaki completed/shipped siparişlerden hesaplanıyor
               — tutarsızlık önlendi
```

---

## 7. API Yapısı

### Toplam Endpoint Sayısı: 35+ (Faz 8 sonrası ~50)

#### Auth (3 endpoint)
| Method | Path | Auth | Rol |
|---|---|---|---|
| POST | /api/v1/auth/login | Hayır | Public |
| POST | /api/v1/auth/logout | Evet | Tümü |
| GET | /api/v1/auth/me | Evet | Tümü |

#### Import (9 endpoint)
| Method | Path | Auth | Rol |
|---|---|---|---|
| POST | /api/v1/imports | Evet | admin, marketing |
| GET | /api/v1/imports | Evet | Tümü |
| GET | /api/v1/imports/:id | Evet | Tümü |
| GET | /api/v1/imports/:id/preview | Evet | Tümü |
| POST | /api/v1/imports/:id/map-columns | Evet | admin, marketing |
| POST | /api/v1/imports/:id/validate | Evet | admin, marketing |
| POST | /api/v1/imports/:id/commit | Evet | admin, marketing |
| GET | /api/v1/imports/:id/errors | Evet | Tümü |
| DELETE | /api/v1/imports/:id | Evet | admin |

#### Channel Mapping (4 endpoint)
| Method | Path | Auth | Rol |
|---|---|---|---|
| GET | /api/v1/mappings/channels | Evet | Tümü |
| POST | /api/v1/mappings/channels | Evet | admin |
| PUT | /api/v1/mappings/channels/:source/:medium | Evet | admin |
| DELETE | /api/v1/mappings/channels/:source/:medium | Evet | admin |

#### Faz 8'de Eklenecekler (Planlanmış)
- POST /api/v1/kpi/run
- GET /api/v1/kpi/summary
- GET /api/v1/dashboard/trend
- GET /api/v1/dashboard/channel-performance
- GET /api/v1/dashboard/platform-performance
- GET /api/v1/dashboard/campaign-performance
- GET /api/v1/dashboard/funnel
- GET /api/v1/filters/options
- CRUD /api/v1/views
- CRUD /api/v1/segments
- GET /api/v1/export/kpi-summary
- GET /api/v1/logs/imports
- GET /api/v1/logs/api
- POST /api/v1/normalize/run

### Auth Akışı

```
1. POST /api/v1/auth/login { email, password }
   ├── userModel.findByEmail(email) → users tablosundan kullanıcı bul
   ├── bcrypt.compare(password, user.password_hash) → şifre doğrula
   │   └── Hata: 401 INVALID_CREDENTIALS
   ├── jwt.sign({ id, email, role, fullName }, JWT_SECRET, { expiresIn: '24h' })
   ├── userModel.updateLastLogin(user.id)
   ├── auditLog('LOGIN')
   └── { token, user: { id, email, role, fullName } }

2. Sonraki istekler:
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

3. verifyToken middleware:
   ├── Header'dan token oku
   ├── jwt.verify(token, JWT_SECRET)
   │   └── Hata: 401 UNAUTHORIZED (expired, invalid, missing)
   └── req.user = { id, email, role, fullName }

4. requireRole('admin', 'marketing') middleware:
   └── req.user.role ∉ izin listesi → 403 FORBIDDEN
```

**Refresh token yok.** 24 saatlik access token yeterli — bu bir e-ticaret analytics dashboard'u, her sabah yeniden login makul. Refresh token eklenmesi Faz sonrası iyileştirme listesinde.

### Middleware Sırası ve Gerekçeleri

```javascript
// 1. helmet — tüm güvenlik header'larını ekle
app.use(helmet())

// 2. cors — cross-origin isteklere izin ver (frontend farklı port)
app.use(cors())

// 3. express.json — body parse (middleware'lerden önce olmalı)
app.use(express.json())

// 4. requestLogger — HER isteği api_logs'a kaydet (auth başarısız olsa bile)
app.use(requestLogger)

// 5. AUTH ROUTE'LARI PUBLIC — verifyToken'dan ÖNCE mount et
//    Neden: login isteği token gerektiriyor olursa sisteme hiç girilemiyor
app.use('/api/v1/auth', authRoutes)

// 6. Protected middleware — bu noktadan sonra tüm route'lar token zorunlu
app.use('/api/v1', verifyToken)
app.use('/api/v1/imports', importRoutes)
app.use('/api/v1/mappings', mappingRoutes)

// 7. errorHandler — tüm next(error) çağrıları buraya düşer
//    Son middleware olmak zorunda (Express kuralı)
app.use(errorHandler)
```

### Rate Limiting

Mevcut implementasyonda rate limiting **yok**. Login endpoint'i brute force'a açık. Faz 8+ için `express-rate-limit` eklenmesi planlanıyor.

### Hata Yönetimi

```javascript
// Tüm controller'lar:
try {
  ...
} catch (err) {
  next(err)  // errorHandler'a pas et
}

// errorHandler:
app.use((err, req, res, next) => {
  const status = err.status || 500
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message
    }
  })
})
```

**Standart Response Formatı** (tüm endpoint'lerde aynı):
```json
{ "success": true,  "data": {...}, "meta": { "total": 100, "page": 1 } }
{ "success": false, "error": { "code": "NOT_FOUND", "message": "Import bulunamadı" } }
```

---

## 8. Frontend Yapısı

> **Durum: Henüz kurulmamıştır (Faz 9-14).** Bu bölüm tasarım kararlarını ve planı açıklamaktadır.

### Sayfa Yapısı (13 Sayfa)

| Sayfa | İçerik |
|---|---|
| Login | JWT alıp localStorage'a kaydet |
| Dashboard | Ana KPI özeti, drag-drop grid, saved views |
| Channels | Kanal bazlı ROAS, gelir, dönüşüm karşılaştırma |
| Campaigns | Kampanya harcama vs gelir, ROAS sıralaması |
| Traffic | Kaynak analizi, bounce rate, oturum süresi |
| Funnel | 6 adımlı huni: liste görüntüleme → satın alma |
| Cohort | Retention heatmap, ay bazlı tablo |
| Import | Dosya yükleme wizard'ı, eşleme, doğrulama, geçmiş |
| Segments | Kullanıcı tanımlı segment oluşturma |
| Views | Kaydedilmiş dashboard layout'ları |
| Export | JSON/CSV indirme |
| Logs | Audit + API log tabloları |
| Settings | Kullanıcı tercihleri |

### State Management

**React Context** tercih edildi. Neden Redux değil? Dashboard filtre state'i (dateFrom, dateTo, channel, campaign, device, city) basit bir düz nesne. Redux'un reducer/action/selector overhead'ini gerektirmiyor. Context + useReducer yeterli.

**Global Filtre Akışı:**
```
useFilters.js (Context Provider)
    ↓ tüketiciyi saran
useUrlSync.js
    └── filtreler ↔ URL query string senkron

Herhangi bir bileşen:
const { filters, setFilter } = useFilters()
```

URL senkronizasyonu neden önemli? Dashboard linkini paylaştığında karşı taraf aynı tarih aralığı ve kanalı görüyor. Sayfa yenilenince filtreler sıfırlanmıyor.

### Grafik Yapısı

```
Chart.js 4 (core)
├── react-chartjs-2 (React wrapper)
├── chartjs-chart-funnel (ek plugin — Funnel sayfası)
└── chartjs-chart-matrix (ek plugin — Cohort heatmap)
```

Her grafik bileşeni kendi loading ve empty state'ini yönetir:
```jsx
if (loading) return <Spinner />
if (!data || data.length === 0) return <EmptyState message="Veri bulunamadı" />
return <LineChart data={data} />
```

Dashboard layout için `react-grid-layout`: sürükle-bırak ile widget pozisyonları değiştirilebilir, JSON olarak `saved_views` tablosuna kaydedilir.

### API Katmanı

```javascript
// services/api.js — TEK axios instance
const api = axios.create({ baseURL: process.env.REACT_APP_API_URL })

// Request interceptor: her isteğe token ekle
api.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`
  return config
})

// Response interceptor: 401 → otomatik login yönlendirme
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) navigate('/login')
    return Promise.reject(error)
  }
)
```

Hiçbir bileşen doğrudan `fetch` veya `axios` çağırmaz. Her API çağrısı `services/api.js` üzerinden geçer.

---

## 9. Güvenlik Önlemleri

### SQL Injection

**Parameterized queries — her yerde:**
```javascript
// DOĞRU — parametre binding
pool.execute('SELECT * FROM users WHERE email = ?', [email])
pool.query('WHERE campaign_name = ? AND date BETWEEN ? AND ?', [name, from, to])

// YANLIŞ — asla yok
pool.query(`WHERE email = '${email}'`)  // Bu projede kullanılmıyor
```

mysql2'nin `?` placeholder'ları otomatik escape yapıyor. Kullanıcıdan gelen hiçbir değer direkt SQL string'ine gömülmüyor.

### XSS

**Helmet middleware** ile Content-Security-Policy header'ı otomatik ekleniyor.
Frontend React kullanıyor — React default olarak tüm render edilen değerleri escape ediyor (`dangerouslySetInnerHTML` kullanılmıyor).

### Input Sanitization

`importController.js`'de kaynak tablo adı whitelist kontrolü:
```javascript
const MAPPINGS = { ga4_traffic: ..., meta_ads: ..., ... } // 11 geçerli değer
if (!MAPPINGS[source_table]) throw new Error('Geçersiz source_table')
```

Kullanıcı `source_table` parametresine `; DROP TABLE orders; --` giremez — enum validation reddeder.

### File Upload Güvenliği

multer konfigürasyonu:
- Yalnızca CSV, XLSX, JSON kabul ediliyor (fileFilter ile)
- Dosya adı sanitize edildi — orijinal ad DB'de saklanıyor ama dosya sistemi üzerinde `import_<id>.<ext>` adıyla kaydetme yapılıyor

### JWT Güvenliği

- Token imzası `JWT_SECRET` environment variable'dan geliyor (kaynak kodda yok)
- Expiry: 24 saat
- Blacklist yok (stateless) — logout yapıldığında client token'ı siliyor, server zaten yoktan geçerlilik kontrolü yapamaz. Kritik güvenlik senaryolarında (hesap güvenlik ihlali) tüm kullanıcı tokenlarını geçersiz kılmak için JWT_SECRET rotasyonu gerekir — bu mevcut implementasyonun bilinen limiti.

### Audit Logging

Her kritik işlem `audit_logs` tablosuna yazılıyor:
- Login / Logout
- Import upload, commit, rollback
- KPI yeniden hesaplama
- Channel mapping değişiklikleri

Log: `{ userId, action, tableName, recordId, oldValue, newValue, ipAddress, createdAt }`

---

## 10. Cache Stratejisi

### Redis Yok — Aggregation Tablolar Cache Görevi Yapıyor

**Mimari karar: Redis kullanılmıyor.**

Bunun yerine `agg_*` ve `kpi_daily_*` tabloları (7 tablo) pre-computed cache görevi yapıyor.

| Cache Türü | Nasıl | TTL |
|---|---|---|
| KPI verisi | agg_* tablolar | Import sonrası TRUNCATE + yeniden hesapla |
| Dashboard sorguları | agg_* tablolarından direkt SELECT | Veri değişene kadar geçerli |
| Filtre seçenekleri | Her istek distinct query | Cache yok, küçük sorgu |

**Neden Redis eklenmedi?**
1. Veri yalnızca import sırasında değişiyor (canlı API yok, CSV upload var). Import arası cache invalidation sorunu yok.
2. Dashboard sorguları zaten indeksleri olan aggregate tablolardan okuyorsa milisaniyeler alıyor.
3. Redis eklemenin kompleksite maliyeti (TTL yönetimi, invalidation mantığı) bu projede gereksiz.

**Redis Ne Zaman Gerekli Olur?**
Production'da canlı API bağlantıları eklenirse ve veriler sürekli değişirse, sık kullanılan dashboard sorgularını Redis'e almak mantıklı olur.

### Swagger Lazy Loading

Swagger başlangıçta yüklenmez, yalnızca `/api/v1/docs` isteğinde:
```javascript
router.use('/docs', (req, res, next) => {
  if (!swaggerUi) {
    swaggerUi = require('swagger-ui-express')
    // swagger spec oluştur
  }
  next()
})
```

Neden? `swagger-jsdoc` 100+ dosya yüklüyor. macOS'ta soğuk başlatmada Gatekeeper her dosyayı tarıyor (~3s/dosya). Lazy load ile sunucu başlatma süresi kısaltıldı.

---

## 11. Bilinen Eksiklikler ve İyileştirme Alanları

### Mevcut Eksiklikler

| Alan | Eksiklik | Etki |
|---|---|---|
| **Frontend** | Faz 9-14 henüz başlanmadı | UI yok, API'ler test edilemiyor görsel olarak |
| **Rate Limiting** | Login endpoint'inde brute force koruması yok | Güvenlik riski |
| **Refresh Token** | JWT'nin 24 saatlik access token'ı var, refresh yok | Her 24 saatte re-login |
| **JWT Blacklist** | Logout sonrası token hâlâ geçerli | Çalınan token 24 saat boyunca geçerli |
| **Chunk Import** | Büyük dosyalar tek transaction'da | 500K+ satır bellek basıncı |
| **Input Validation Middleware** | Schema bazlı istek doğrulaması yok (Joi/Zod gibi) | Controller'a geçersiz veri düşebilir |
| **Test Suite** | Otomatik unit/integration test yok | Regresyon tespiti manuel |

### Performans İyileştirme Alanları

**1. Soğuk Başlatma Süresi (~6 dakika, macOS):**
Node.js her `require()` ile dosyayı diskten okuyor. macOS APFS şifreli disk + Gatekeeper her unsigned JS dosyasını tarıyor → ~3s/dosya. 350 dosya × ~3s = ~360s. İkinci başlatma hızlı (kernel cache sıcak). Sunucuyu bir kez başlatıp sürekli çalışır tutarak aşılıyor.

**2. KPI Hesaplama Süresi:**
Şu an tüm KPI tabloları her import sonrası TRUNCATE + full recalculate yapılıyor. Büyük veri setinde bütünsel yeniden hesaplama yerine yalnızca değişen tarih aralığı için delta hesaplama daha verimli olur.

**3. Import Pipeline — Chunk Desteği:**
Büyük CSV dosyaları için streaming parse + batch INSERT. Her 1.000 satır için ayrı transaction.

### Gelecekte Eklenebilecek Özellikler

- Canlı API bağlantıları (Meta Graph API, Google Ads API, GA4 Data API)
- Email/Slack alert sistemi (ROAS X değerin altına düşünce)
- Dashboard PDF export
- Kullanıcı yönetimi paneli (admin için)
- A/B test sonuç analizi katmanı
- MySQL Partition stratejisi (production'da büyük tablolar için)

---

## 12. Sorulabilecek Zor Sorular ve Cevapları

### "Neden MongoDB değil MySQL?"

Bu projenin veri modeli yüksek derecede ilişkisel. `campaign_name` beş farklı tabloda join anahtarı olarak kullanılıyor (`orders`, `meta_ads`, `google_ads`, `agg_campaign_performance`, `ga4_traffic`). MongoDB'de referential integrity (FK kısıtları) yok — bir kampanya adı değiştiğinde beş tabloda tutarlılığı korumak uygulama kodu sorunluluğuna giriyor. Ayrıca cohort analizi, weighted average ve window function'lar SQL'de tek sorgu. MongoDB aggregation pipeline ile yazılabilir ama okunabilirliği çok daha düşük, performansı daha az öngörülebilir.

### "Bu kadar tablo neden var, basitleştiremez miydin?"

Her tablo grubunun spesifik amacı var. Raw tablolar olmadan import hatalandığında orijinal veri kaybolur. KPI tabloları olmadan her dashboard açılışında 100K+ satır üzerinde on-the-fly hesaplama yapmak gerekir — bu saniyeler değil dakikalar alabilir. Aggregation tabloları olmadan cross-platform raporlama mümkün değil (Meta + Google + GA4 karşılaştırması). Sistem/audit tabloları olmadan kim ne yaptı bilinmiyor. 32 tablo fazla görünebilir ama her biri bir katmanın sorumluluğunu temsil ediyor.

### "Import sırasında sistem çökerse ne olur?"

Raw tabloya yaz → transform → clean tabloya yaz işlemi tek MySQL transaction içinde sarılıyor. Herhangi bir adımda hata → `ROLLBACK` → raw tabloya yazılan da geri alınıyor. `imports.status` `failed` olarak işaretleniyor. Kullanıcı hatayı görüp yeniden deneyebilir. İdeal olmayan senaryo: transaction commit olduktan sonra KPI hesaplama başlamadan server çöker. Bu durumda `imports.status = committed` ama KPI tabloları güncellenmemiş. Çözüm: KPI run'ı `POST /api/v1/kpi/run` endpoint'i ile manuel tetikleyebilir. Otomatik recovery (restart'ta pending KPI run'ları tamamla) Faz 8 sonrası iyileştirme listesinde.

### "1 milyon satır veriyi nasıl handle ediyorsun?"

Mevcut implementasyon chunk'lamıyor — tüm dosya belleğe yükleniyor. Dummy veri için en büyük dosya 46.317 satır, bu sorun değil. Production için: streaming CSV parse + 1.000 satırlık batch INSERT. mysql2'nin `connection.query()` ile bulk INSERT değil, prepared statement pool batch kullanılır. KPI hesaplama tarafında MySQL TRUNCATE + re-INSERT zaten set-based (satır satır değil, toplu SQL işlemi). 1M satır için bu süreç birkaç dakika alır ama sunucu bloklanmaz — `runAllKpi()` async ve import response'u bloklamıyor.

### "KPI hesapları gerçek zamanlı mı?"

Hayır — intent olarak gerçek zamanlı değil. Her import sonrası tetiklenen batch hesaplama. Bu bilinçli bir tasarım kararı: canlı e-ticaret sistemleri saniyede yüzlerce sipariş işlerken aggregation tabloları günde birkaç kez güncelleniyor. Sporthink'in iş akışı "sabah veri yükle, güne veriyle başla" şeklinde. Gerçek zamanlı ihtiyaç olmadığından Redis pub/sub, WebSocket veya streaming aggregation eklenmedi.

### "Neden Sequelize değil raw SQL?"

Başlangıçta hibrit yaklaşım planlanmıştı: basit CRUD için Sequelize, KPI sorguları için raw SQL. Ancak Sequelize'in `validator` bağımlılığı 100+ dosya yükleyerek macOS'ta sunucu başlatmayı 5+ dakikaya çıkardı. Performans sorunu test edilemez hale getiriyordu. Karar: Sequelize tamamen kaldırıldı, tüm modeller `mysql2/promise pool` ile yazıldı. Sonuç: KPI + CRUD + auth + import hepsi aynı veritabanı erişim katmanını kullanıyor, tutarlılık arttı.

### "Neden GA4 attribution primary, Meta/Google değil?"

Her reklam platformu kendi pixel'ini kullanır. Bir kullanıcı Instagram reklamını görür, sonra Google reklamını görür, sonra satın alır. Meta bu satışı kendi başarısı olarak raporlar, Google da. Toplam "atfedilen gelir" gerçek gelirin 2-3 katı olabilir. GA4 session-based attribution kullanır: her oturuma tek bir kaynak atfedilir (last non-direct click), satın alma o kaynak altında sayılır. Tek sayım garantisi var. Bu yüzden `orders.channel` = GA4'ten derive edilen kanaldır, ve ROAS hesabında `orders.net_revenue` kullanılır.

### "Index eklemek neden önemli? Yoksa ne olur?"

Index olmadan `WHERE campaign_name = 'summer_sale'` sorgusu tüm `meta_ads` tablosunu (2.994 satır) tarar — full table scan. Index varsa B-tree üzerinde O(log n) arama. Tek tablo için fark küçük görünse de JOIN'lerde çarpımlı oluyor: `orders` (14K) × `meta_ads` (2.9K) = 41M satır karşılaştırması vs. indeksli O(log n). Dashboard'da filtreli aggregation sorguları index olmadan saniyeler alırdı.

### "Partition neden uygulanmadı?"

İki neden: Birincisi, dummy veri boyutu partition gerektirmiyor. İkincisi, MySQL'de FK kullanan tablolara partition uygulanamaz (engine kısıtı). `orders` tablosu FK içerdiğinden partition eklemek FK kısıtlarını kaldırmayı gerektiriyor — veri bütünlüğünden ödün veriliyor. Production geçişinde kararı yeniden değerlendirmek gerekiyor: ya FK kaldır + uygulama seviyesinde tut, ya da partition yerine tablo partitioning alternatiflerini değerlendir.

### "Kullanıcı silinirse onun importsları ne olur?"

Mevcut şemada `imports.user_id` → `users.id` HARD FK. Kullanıcı silmek bir FK violation üretiyor. İki seçenek: Soft delete (users'a is_deleted kolonu ekle, satırı silme) veya CASCADE DELETE (kullanıcı silinince importları da sil). Şu an bu senaryo için explicit bir karar alınmamış — users tablosunda `is_active` flag var, kullanıcılar pasif yapılabilir ama silinemiyor.

### "Viewer rolü neden commit yapamıyor?"

Veri bütünlüğü. Commit işlemi: (1) DB'ye 46K satır yazar, (2) KPI tablolarını tamamen yeniler, (3) dashboard verisini değiştirir. Bir viewer yanlışlıkla bozuk veri yükleyip commit ederse tüm raporlar bozulur. `admin` ve `marketing` rolü bu sorumluluğu üstlenebilecek kullanıcılar. Rollback da yalnızca admin — veri silme daha kritik bir işlem.

---

*Bu rapor 2026-04-22 tarihi itibarıyla Sporthink KPI Dashboard projesinin Faz 7 sonundaki durumunu yansıtmaktadır. Frontend (Faz 9-14) henüz geliştirilme aşamasında değildir.*
