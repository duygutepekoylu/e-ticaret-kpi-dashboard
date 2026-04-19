# process.md — Sporthink Proje Durumu

## Güncel Durum

**Aktif Faz:** Faz 3 — Import: Parser + Previewer + Validator
**Genel İlerleme:** 2/14 faz tamamlandı
**Son Güncelleme:** 2026-04-20

---

## Tamamlanan Fazlar

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
