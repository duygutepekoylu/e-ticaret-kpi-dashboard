# CLAUDE.md — Sporthink KPI Dashboard

## Proje Bağlamı

**Ne:** Sporthink e-ticaret şirketinin pazarlama ve satış KPI dashboard'u.
GA4, Meta Ads, Google Ads ve e-ticaret verilerini tek ekranda toplar,
KPI hesaplar, görselleştirir.

**Veri kaynağı:** Tamamen dummy CSV dosyaları — canlı API bağlantısı yok.
Gerçek sistemi simüle eden import akışı kullanılıyor. Production'da
API bağlantısı kurulacak ama şu an kapsam dışı.

**Temel mimari karar:** Satış attribution için GA4 verileri referans alınır.
Meta ve Google Ads kendi dönüşümlerini şişirebilir — bu platformların
pixel/conversion değerleri ROAS hesabında kullanılmaz. Gelir her zaman
`orders` tablosundan okunur. Bu kural ihlal edilemez.

**Kullanıcı rolleri:** Admin (tam erişim), Pazarlama Yetkilisi (raporlar
ve import), Viewer (sadece okuma).

**Dashboard felsefesi:** Sadece rakam göstermek değil, "neden böyle oldu?"
sorusunu cevaplayabilmek. Drill-down, cross-filter, segment analizi bunun için.

---

## Teknoloji Stacki

| Katman | Teknoloji | Not |
|---|---|---|
| Veritabanı | MySQL 8.0 | 32 tablo, schema hazır |
| Backend | Node.js + Express | REST v1, JWT auth |
| API Docs | swagger-jsdoc | Koddan üretim, manuel değil |
| Frontend | React + Tailwind CSS | — |
| Grafikler | react-chartjs-2 | + funnel + matrix plugin |
| Pivot | @tanstack/react-table | — |
| Dashboard layout | react-grid-layout | Drag-drop, saved views |
| Filtre state | React Context | useFilters.js + useUrlSync.js |
| Cache | Yok | Aggregation tablolar bu işi yapıyor |

---

## Klasör Yapısı

```
sporthink/
├── CLAUDE.md + roadmap.md + process.md
├── docs/              ← schema, kpi_rules, data_mapping, api_rules
├── database/          ← schema/, seeds/, migrations/, fixtures/, scripts/
├── backend/src/
│   ├── config/        ← database.js, env.js
│   ├── importer/      ← config/(11 mapping), parsers/, previewer,
│   │                     duplicateChecker, validator, transformer, mapper, importer
│   ├── kpi/           ← formulas.js + traffic, ads, sales, channel,
│   │                     campaign, product, cohort
│   ├── models/        ← SQL sorguları burada, controller'da ham SQL yok
│   ├── routes/v1/     ← auth, imports, mappings, normalize, kpi,
│   │                     dashboard, filters, views, segments, export, logs
│   ├── controllers/   ← iş mantığı
│   ├── middleware/     ← auth.js, requestLogger.js, errorHandler.js
│   └── utils/         ← formatters.js, auditLogger.js, dbHelpers.js
└── frontend/src/
    ├── components/    ← charts/, filters/, kpi/, layout/, tables/, ui/
    ├── pages/         ← 13 sayfa
    ├── hooks/         ← useFilters.js, useUrlSync.js
    └── services/      ← api.js (tüm API çağrıları buradan)
```

---

## %95 Güven Kuralı

### Kesinlikle Sor — Onay Almadan Yapma
- Var olan tablo, sütun veya FK değiştirme ya da silme
- KPI formülü değiştirme
- `roadmap.md`'de olmayan bir iş yapma
- Mevcut dosya silme veya taşıma
- Bir fazı tamamlayıp bir sonrakine geçme

### Önce İlgili Docs Dosyasını Oku, Sonra Yap
- DB sorgusu → `docs/schema.md`
- KPI hesaplama → `docs/kpi_rules.md`
- Import/dönüşüm → `docs/data_mapping.md`
- API endpoint → `docs/api_rules.md`

### Serbestçe Yap
- `roadmap.md`'de planlanan yeni dosya oluşturma
- Yorum satırı, log mesajı, hata metni
- Test verisi, placeholder içerik

---

## Kritik Kurallar

**1. ROAS = orders.net_revenue / reklam harcaması**
Neden: Reklam platformları kendi dönüşümlerini şişirebilir.
Meta `pixel_purchase_value` ve Google `conversions_value` kullanılmaz.
Nerede: `kpi/ads.js`, `kpi/campaign.js`, `agg_campaign_performance`

**2. Bounce rate, pages_per_session, avg_session_duration → weighted average**
Neden: Basit AVG farklı hacimli kaynakları eşit ağırlıkta sayar, yanıltır.
Formül: `SUM(değer * sessions) / SUM(sessions)`
Nerede: `kpi/formulas.js` → `weightedAvg()` her yerde kullanılır.

**3. GA4 item-scoped + session-scoped aynı sorguda birleştirilemez**
Neden: GA4 API kısıtı — farklı boyut kapsamları.
`ga4_item_interactions` ile `ga4_traffic` JOIN yapılmaz, asla.
Nerede: `kpi/product.js` özellikle dikkat.

**4. Google Ads maliyet alanları mikro birimdir → her zaman ÷ 1.000.000**
`cost_micros`, `average_cpc`, `average_cpm`, `cost_per_conversion` hepsi.
Nerede: `importer/transformer.js`

**5. Meta CTR yüzde formatında gelir → ÷ 100 ile normalize edilir**
`2.25` → `0.0225` — GA4 ve Google ile aynı formatta saklanır.
Nerede: `importer/transformer.js`

**6. google_ads.product_item_id nullable → LEFT JOIN kullan**
Search kampanyalarında NULL gelir — INNER JOIN yapma.
Nerede: `models/googleAds.js`, `kpi/product.js`

**7. GA4 date alanı integer olarak gelir → DATE'e çevrilmeli**
`20241001` → `2024-10-01`
Nerede: `importer/transformer.js`

**8. campaign_name tüm platformlar arası join key**
`orders`, `meta_ads`, `google_ads`, `ga4_traffic` — hepsi bu üzerinden bağlanır.
Nerede: Tüm KPI ve aggregation sorguları.

**9. agg_cohort_retention ay bazlı çalışır**
cohort_month formatı: `YYYY-MM` — gün bazlı değil.
Nerede: `kpi/cohort.js`

**10. API response formatı standarttır — her endpoint bunu kullanır**
```json
{ "success": true, "data": {}, "meta": { "total": 0 } }
{ "success": false, "error": { "code": "", "message": "" } }
```
Nerede: `utils/formatters.js` → controller'lar bu fonksiyonu çağırır.

---

## Kodlama Standartları

**Backend:**
- Async işlemler: `async/await` — callback ve `.then()` zinciri yok
- Hata yönetimi: her route'da `try/catch`, `next(error)` ile errorHandler'a pas
- SQL: model dosyasında — controller'da ham SQL yazılmaz
- Swagger: her endpoint'e `@swagger` JSDoc yorumu eklenir
- İsimlendirme: değişken/fonksiyon camelCase, dosya camelCase, klasör küçük harf

**Veritabanı erişim stratejisi — hybrid yaklaşım:**
- Sequelize ORM: users, imports, saved_views, segments,
  audit_logs, api_logs — basit CRUD işlemleri
- Raw SQL (mysql2): ga4Traffic, metaAds, googleAds,
  kpi_* ve agg_* modelleri — KPI, aggregation,
  cohort, weighted avg, ROAS sorguları
- Controller'da ham SQL yazılmaz — model katmanında kalır

**Frontend:**
- Bileşen: PascalCase | Hook: `useXxx` | Servis: camelCase
- API çağrısı: sadece `services/api.js` — başka yerde fetch/axios yok
- Global filtre: sadece `useFilters.js` — prop drilling yok
- Her grafik bileşeni kendi loading ve empty state'ini yönetir
- Boş veri: grafik çökmez, "Veri bulunamadı" gösterir

**Genel:**
- `console.log` geliştirme sırasında OK, production'da kaldırılır
- Her fonksiyon tek iş yapar
- Yorum satırı Türkçe OK, kod İngilizce

---

## Faz Takibi

Her faz sonunda şu sırayla:
1. `roadmap.md` checkbox'larını işaretle
2. Tüm test kriterlerinin geçildiğini doğrula
3. `process.md`'ye tamamlanan faz özetini ekle
4. Kullanıcıdan bir sonraki faza geçiş onayı al

`process.md` güncelleme formatı:
```markdown
## Faz N — [İsim] ✅
Tamamlanma: YYYY-MM-DD
Özet: [Ne yapıldı, ne test edildi, önemli notlar]
```

---

## Referanslar

| Ne yapıyorsun | Önce hangi dosyayı oku |
|---|---|
| DB sorgusu, tablo, FK | `docs/schema.md` |
| KPI formülü, hesaplama | `docs/kpi_rules.md` |
| CSV import, dönüşüm kuralı | `docs/data_mapping.md` |
| API endpoint, response, auth | `docs/api_rules.md` |
| Proje durumu, tamamlanan fazlar | `process.md` |
| Sıradaki görev, test kriterleri | `roadmap.md` |
