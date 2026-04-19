# docs/api_rules.md — API Kuralları

## Temel Kurallar

- Tüm endpoint'ler `/api/v1/` prefix'i ile başlar
- Tüm veri alışverişi JSON formatında
- Her endpoint'e `@swagger` JSDoc yorumu eklenir
- Auth gerektiren endpoint'ler: tüm endpoint'ler login dışında
- Rol kontrolü: middleware'de `requireRole(['admin', 'marketing'])` şeklinde

---

## Response Formatı — İstisnasız

**Başarılı:**
```json
{
  "success": true,
  "data": {},
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

**Hata:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "date alanı zorunludur"
  }
}
```

**utils/formatters.js kullanımı:**
```javascript
// Controller'da her zaman bu fonksiyonları kullan
res.json(success(data, meta))
res.status(400).json(error('VALIDATION_ERROR', 'date alanı zorunludur'))
```

---

## HTTP Status Kodları

| Kod | Durum |
|---|---|
| 200 | Başarılı GET, PUT |
| 201 | Başarılı POST (kayıt oluşturuldu) |
| 400 | Validation hatası, eksik alan |
| 401 | Token yok veya geçersiz |
| 403 | Yetkisiz erişim (rol uyumsuz) |
| 404 | Kayıt bulunamadı |
| 409 | Conflict (duplicate kayıt) |
| 500 | Sunucu hatası |

---

## Auth Endpoint'leri

| Method | Endpoint | Rol | Açıklama |
|---|---|---|---|
| POST | /api/v1/auth/login | Public | JWT token üret |
| POST | /api/v1/auth/logout | Tümü | Token geçersiz kıl |
| GET | /api/v1/auth/me | Tümü | Oturum bilgisi |

**Login request:**
```json
{ "email": "admin@sporthink.com", "password": "..." }
```
**Login response (data):**
```json
{ "token": "eyJ...", "user": { "id": 1, "email": "...", "role": "admin" } }
```

---

## Import Endpoint'leri

| Method | Endpoint | Rol | Açıklama |
|---|---|---|---|
| POST | /api/v1/imports | admin, marketing | Dosya yükle (multer) |
| GET | /api/v1/imports | Tümü | Import geçmişi |
| GET | /api/v1/imports/:id | Tümü | Import detayı |
| GET | /api/v1/imports/:id/preview | Tümü | İlk 10 satır önizleme |
| POST | /api/v1/imports/:id/map-columns | admin, marketing | Kolon eşlemeyi kaydet |
| POST | /api/v1/imports/:id/validate | admin, marketing | Veriyi doğrula |
| POST | /api/v1/imports/:id/commit | admin, marketing | DB'ye yaz + KPI tetikle |
| GET | /api/v1/imports/:id/errors | Tümü | Hatalı satır raporu |
| DELETE | /api/v1/imports/:id | admin | Rollback |

**Import akışı sırası:** upload → preview → map-columns → validate → commit

---

## KPI Endpoint'leri

| Method | Endpoint | Rol | Açıklama |
|---|---|---|---|
| POST | /api/v1/kpi/run | admin | KPI yeniden hesapla |
| GET | /api/v1/kpi/summary | Tümü | Özet metrikler |

**KPI run response:** `{ "triggered": true, "tables": ["kpi_daily_traffic", ...] }`

---

## Dashboard Endpoint'leri

Tüm dashboard endpoint'leri filtre parametreleri alır:

**Ortak filtre parametreleri:**
```
?date_from=2024-10-01
&date_to=2025-03-31
&channel=Paid+Social
&campaign=SP_Retargeting_Mart_2025
&device=mobile
&city=Istanbul
&platform=meta
```

| Method | Endpoint | Açıklama |
|---|---|---|
| GET | /api/v1/dashboard/trend | Zaman serisi — ciro, oturum, harcama |
| GET | /api/v1/dashboard/channel-performance | Kanal bazlı KPI |
| GET | /api/v1/dashboard/platform-performance | Meta vs Google karşılaştırma |
| GET | /api/v1/dashboard/campaign-performance | Kampanya sıralaması |
| GET | /api/v1/dashboard/funnel | 6 adımlı huni verisi |

---

## Diğer Endpoint'ler

| Method | Endpoint | Rol | Açıklama |
|---|---|---|---|
| GET | /api/v1/filters/options | Tümü | Filtre seçenekleri (kanal, kampanya listesi) |
| POST | /api/v1/normalize/run | admin | Kanal normalizasyonu çalıştır |
| GET | /api/v1/mappings/channels | Tümü | Kanal eşleme listesi |
| POST | /api/v1/mappings/channels | admin | Yeni kanal eşleme |
| PUT | /api/v1/mappings/channels/:id | admin | Güncelle |
| DELETE | /api/v1/mappings/channels/:id | admin | Sil |
| GET | /api/v1/views | Tümü | Saved views listesi |
| POST | /api/v1/views | Tümü | Yeni view kaydet |
| PUT | /api/v1/views/:id | Tümü | View güncelle |
| DELETE | /api/v1/views/:id | Tümü | View sil |
| GET | /api/v1/segments | Tümü | Segment listesi |
| POST | /api/v1/segments | Tümü | Yeni segment oluştur |
| GET | /api/v1/segments/:id/preview | Tümü | Segment önizleme |
| POST | /api/v1/segments/:id/apply | Tümü | Segmenti uygula |
| GET | /api/v1/export/kpi-summary | Tümü | KPI JSON export |
| GET | /api/v1/export/channel-performance | Tümü | Kanal performansı JSON |
| GET | /api/v1/export/campaign-performance | Tümü | Kampanya performansı JSON |
| GET | /api/v1/export/raw | admin | Ham veri JSON |
| GET | /api/v1/logs/imports | admin | Import logları |
| GET | /api/v1/logs/api | admin | API logları |

---

## Swagger JSDoc Örneği

Her route dosyasına şu formatta yorum ekle:

```javascript
/**
 * @swagger
 * /api/v1/dashboard/trend:
 *   get:
 *     summary: Zaman serisi performans verisi
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date_from
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *         example: "2024-10-01"
 *       - in: query
 *         name: date_to
 *         schema:
 *           type: string
 *           format: date
 *         required: true
 *     responses:
 *       200:
 *         description: Başarılı
 *       401:
 *         description: Yetkisiz
 */
```

---

## Middleware Sırası

```javascript
// app.js'de middleware sırası
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(requestLogger)   // api_logs tablosuna yaz
app.use('/api/v1/auth', authRoutes)           // public
app.use('/api/v1', verifyToken, allRoutes)    // protected
app.use(errorHandler)    // en son
```

---

## Rol Yetki Tablosu

| Endpoint Grubu | admin | marketing | viewer |
|---|---|---|---|
| Auth | ✓ | ✓ | ✓ |
| Dashboard (okuma) | ✓ | ✓ | ✓ |
| KPI (okuma) | ✓ | ✓ | ✓ |
| Import (yükleme, commit) | ✓ | ✓ | ✗ |
| Import (rollback, silme) | ✓ | ✗ | ✗ |
| Mappings (değiştirme) | ✓ | ✗ | ✗ |
| KPI (yeniden hesaplama) | ✓ | ✗ | ✗ |
| Logs | ✓ | ✗ | ✗ |
| Export | ✓ | ✓ | ✓ |
| Views & Segments | ✓ | ✓ | ✓ |
