# Pazarlama ve E-Ticaret KPI Dashboard Geliştirme

## 1. Proje Vizyonu ve İş Hedefi

KPI (Key Performance Indicator), bir organizasyonun belirlediği hedeflere ne ölçüde ulaştığını değerlendirmek amacıyla kullanılan ölçülebilir performans göstergeleridir. Dijital pazarlama ve e-ticaret alanında KPI'lar; trafik, reklam performansı, dönüşüm oranı ve satış gibi kritik metrikler üzerinden işletmelerin performansını analiz etmeyi mümkün kılar.

Bu proje, şirketlerin dijital pazarlama ve e-ticaret performansını ölçmek için kullandığı temel ve ileri seviye KPI'ları tek bir merkezde toplayan, gerçek zamanlıya yakın veri akışını simüle eden ve karar alma süreçlerini hızlandıran profesyonel bir dashboard sistemi geliştirmeyi amaçlamaktadır.

Günümüzde ekipler veri odaklı karar almak isterken veriler çoğu zaman farklı platformlara dağılmış durumdadır. Bu durum, analiz süreçlerini zorlaştırmakta ve karar alma hızını düşürmektedir. Bu proje kapsamında geliştirilecek sistem:

- Google Analytics, Meta Ads, Google Ads ve satış verilerini tek merkezde toplar
- KPI'ları gerçek iş senaryolarına uygun şekilde hesaplar
- Görselleştirme ve filtreleme araçlarıyla karar süreçlerini hızlandırır
- Gerçek sistemlere entegre edilebilecek bir mimari yaklaşım sunar

> Proje tamamen dummy veri setleri üzerinden geliştirilecektir.

---

## 2. Teknoloji ve Teknik Mimari

### 2.1 Frontend

- **Framework:** React
- **Grafik Kütüphanesi:** Chart.js

**Beklenen Standartlar:**
- Component bazlı mimari
- Responsive tasarım

### 2.2 Backend

- **Teknoloji:** Node.js (Express)
- REST API mimarisi zorunludur
- JSON veri formatı kullanılmalıdır
- Cache yapısı önerilir (Redis)

### 2.3 Veri Depolama

- **Veritabanı:** MySQL

**Beklenen Yapı:**
- Normalize edilmiş veri modeli
- KPI hesaplamaları için aggregation tabloları
- Filtreleme performansı için indexleme
- Tarih bazlı partition önerilir

### 2.4 Veri Kaynak Simülasyonu

Sistem aşağıdaki veri formatlarını içeri alabilmelidir:

- CSV
- XLSX
- JSON

**Import sırasında şunlar olmalıdır:**
- Kolon eşleme
- Tip doğrulama
- Hata satırı raporu

### 2.5 API Yapısı

- REST API mimarisi ile çalışmalıdır
- Tüm veri alışverişi JSON formatında yapılmalıdır

### 2.6 Kimlik Doğrulama

- **Önerilen Yöntem:** JWT Authentication

### 2.7 API Dokümantasyonu

API uç noktaları aşağıdaki araçlardan biri ile dokümante edilmelidir:

- Swagger
- OpenAPI

---

## 3. Proje Kapsamı (MVP)

### 3.1 Veri Import Modülü

#### 3.1.1 Desteklenen Veri Kaynakları (Simülasyon)

##### Google Analytics Veri Seti

Web sitesi trafik performansını analiz etmek için kullanılır ve KPI hesaplamalarında temel veri kaynağıdır.

| Alan | Açıklama |
|---|---|
| `date` | Tarih |
| `source` | Trafik kaynağı |
| `medium` | Medium |
| `channel_group` | Kanal grubu |
| `sessions` | Oturum sayısı |
| `users` | Kullanıcı sayısı |
| `new_users` | Yeni kullanıcı sayısı |
| `bounce_rate` | Hemen çıkma oranı |
| `avg_session_duration` | Ortalama oturum süresi |
| `pages_per_session` | Oturum başına sayfa |
| `conversions` | Dönüşüm sayısı |
| `revenue` | Gelir |

##### Meta Ads Veri Seti

Meta reklam performansını analiz etmek ve ROAS, CPC, CTR gibi metrikleri hesaplamak için kullanılır.

| Alan | Açıklama |
|---|---|
| `date` | Tarih |
| `campaign_name` | Kampanya adı |
| `adset_name` | Reklam seti adı |
| `ad_name` | Reklam adı |
| `impressions` | Gösterim sayısı |
| `clicks` | Tıklama sayısı |
| `spend` | Harcama |
| `ctr` | Tıklama oranı |
| `cpc` | Tıklama başına maliyet |
| `conversions` | Dönüşüm sayısı |
| `conversion_value` | Dönüşüm değeri |

##### Google Ads Veri Seti

Google Ads reklam performansını analiz etmek için kullanılır.

| Alan | Açıklama |
|---|---|
| `date` | Tarih |
| `campaign_name` | Kampanya adı |
| `ad_group` | Reklam grubu |
| `impressions` | Gösterim sayısı |
| `clicks` | Tıklama sayısı |
| `cost` | Maliyet |
| `ctr` | Tıklama oranı |
| `avg_cpc` | Ortalama CPC |
| `conversions` | Dönüşüm sayısı |
| `conversion_value` | Dönüşüm değeri |

##### Satış Veritabanı Veri Seti (E-Ticaret)

E-ticaret performansı, dönüşüm oranı ve kanal bazlı ciro analizleri için kullanılır.

| Alan | Açıklama |
|---|---|
| `order_id` | Sipariş ID |
| `order_date` | Sipariş tarihi |
| `customer_id` | Müşteri ID |
| `city` | Şehir |
| `device` | Cihaz |
| `channel` | Kanal |
| `product_count` | Ürün adedi |
| `order_revenue` | Sipariş geliri |
| `discount_amount` | İndirim tutarı |
| `refund_amount` | İade tutarı |

#### 3.1.2 Import Sistem Gereksinimleri

**Dosya Desteği:** CSV, XLSX, JSON

**Import Özellikleri:**
- Veri önizleme ekranı
- Kolon eşleme (mapping)
- Veri tipi doğrulama
- Zorunlu alan kontrolü
- Duplicate kayıt kontrolü
- Hatalı satır raporu

#### 3.1.3 Veri Standartlaştırma

Import sonrası sistem:
- Kanal isimlerini normalize etmeli
- Tarih formatlarını standardize etmeli
- Para birimini normalize etmeli
- Platform verilerini tek yapıda birleştirmelidir

#### 3.1.4 Import Sonrası Veri Akışı

Import tamamlandıktan sonra:
- Veriler MySQL tablolarına yazılmalıdır
- KPI hesaplama süreçleri tetiklenmelidir
- Dashboard otomatik güncellenmelidir

---

### 3.2 KPI Hesaplama Modülü

#### 3.2.1 Trafik KPI'ları

| KPI | Açıklama | Hesaplama |
|---|---|---|
| Toplam Oturum (Sessions) | Belirlenen tarih aralığında siteye yapılan toplam ziyaret sayısı | Seçilen tarih aralığındaki tüm oturumların toplamı |
| Tekil Kullanıcı (Users) | Belirli dönemde siteyi ziyaret eden benzersiz kullanıcı sayısı | Aynı kullanıcı tekrar ziyaret etse bile tek sayılarak toplam benzersiz kullanıcı sayısı |
| Yeni Kullanıcı (New Users) | Daha önce siteyi ziyaret etmemiş kullanıcıların sayısı | İlk kez ziyaret eden kullanıcıların toplamı |
| Hemen Çıkma Oranı (Bounce Rate) | Tek sayfa görüntüleyip çıkan kullanıcı oranı | `(Tek sayfa görüntülenen oturumlar ÷ toplam oturumlar) × 100` |
| Oturum Başına Sayfa (Pages per Session) | Kullanıcıların site içinde ne kadar gezindiği | `Toplam sayfa görüntüleme ÷ toplam oturum` |
| Oturum Süresi (Avg Session Duration) | Kullanıcıların sitede geçirdiği ortalama süre | `Toplam oturum süresi ÷ toplam oturum` |
| Trafikten Siparişe Dönüşüm Oranı (Traffic Conversion Rate) | Oturumların siparişe dönüşme oranı | `(Toplam sipariş ÷ toplam oturum) × 100` |
| Trafik Büyüme Oranı (Traffic Growth Rate) | Önceki dönemle kıyaslandığında trafik artış veya azalışı | `((Mevcut dönem oturum − önceki dönem oturum) ÷ önceki dönem oturum) × 100` |

#### 3.2.2 Reklam KPI'ları

| KPI | Açıklama | Hesaplama |
|---|---|---|
| Toplam Harcama (Ad Spend) | Belirli dönemde reklam platformlarına yapılan toplam harcama | Seçilen tarih aralığındaki toplam reklam harcaması |
| Toplam Gösterim (Impressions) | Reklamların kaç kez görüntülendiği | Tüm kampanyalardaki toplam gösterim |
| Toplam Tıklama (Clicks) | Kullanıcıların reklamlara yaptığı toplam tıklama | Tüm kampanyalardaki toplam tıklama |
| Tıklama Oranı (CTR) | Gösterim başına tıklama oranı | `(Toplam tıklama ÷ toplam gösterim) × 100` |
| Tıklama Başına Maliyet (CPC) | Bir tıklama elde etmek için yapılan ortalama harcama | `Toplam harcama ÷ toplam tıklama` |
| Bin Gösterim Başına Maliyet (CPM) | Marka görünürlüğü metriği | `(Toplam harcama ÷ toplam gösterim) × 1000` |
| Reklam Kaynaklı Sipariş (Ad Conversions) | Reklamdan gelen satış sayısı | Reklam kaynaklı siparişlerin toplamı |
| Dönüşüm Başına Maliyet (Cost per Conversion) | Bir sipariş elde etmek için yapılan ortalama harcama | `Toplam harcama ÷ toplam dönüşüm` |
| Reklam Getirisi (ROAS) | Reklam harcamasına karşı elde edilen gelir | `Reklam kaynaklı gelir ÷ toplam harcama` |
| Gösterim Frekansı (Frequency) | Kullanıcı başına ortalama reklam gösterim sayısı | `Toplam gösterim ÷ erişilen kullanıcı sayısı` |

#### 3.2.3 Satış KPI'ları

| KPI | Açıklama | Hesaplama |
|---|---|---|
| Toplam Ciro (Revenue) | Belirli dönemde elde edilen toplam satış tutarı | Seçilen tarih aralığındaki toplam satış tutarı |
| Sipariş Sayısı (Orders) | Toplam işlem hacmi | Toplam sipariş sayısı |
| Satılan Ürün Adedi (Items Sold) | Operasyon hacmi | Siparişlerdeki toplam ürün adedi |
| Ortalama Sepet Tutarı (Average Order Value) | Sipariş başına ortalama harcama | `Toplam ciro ÷ toplam sipariş` |
| Kullanıcı Başına Gelir (Revenue per User) | Kullanıcı kalitesi metriği | `Toplam ciro ÷ toplam kullanıcı` |
| Tekrar Satın Alma Oranı (Repeat Purchase Rate) | Sadakat metriği | `(Birden fazla sipariş veren müşteri sayısı ÷ toplam müşteri) × 100` |
| İade Oranı (Refund Rate) | Operasyonel kalite ve ürün memnuniyeti | `(Toplam iade tutarı ÷ toplam ciro) × 100` |
| Ciro Büyüme Oranı (Revenue Growth Rate) | Önceki dönemle karşılaştırmalı performans | `((Mevcut ciro − önceki ciro) ÷ önceki ciro) × 100` |

#### 3.2.4 Pazarlama Performans KPI'ları

| KPI | Açıklama | Hesaplama |
|---|---|---|
| Kanal Bazlı Ciro (Revenue by Channel) | Hangi kanalın daha verimli olduğu | Kanal bazlı toplam satış tutarı |
| Kanal Bazlı Dönüşüm Oranı (Conversion Rate by Channel) | Trafik kalitesi | `(Kanal bazlı sipariş ÷ kanal bazlı oturum) × 100` |
| Kampanya Bazlı Gelir (Revenue by Campaign) | Kampanya performansı | Kampanya kaynaklı toplam satış tutarı |
| Yeni vs Geri Dönen Gelir (New vs Returning Revenue) | Büyüme modeli analizi | Yeni müşterilerden ve mevcut müşterilerden gelen cironun ayrı hesaplanması |
| Günlük Performans Değişimi (Daily Performance Change) | Gün bazlı performans dalgalanmaları | `((Bugünkü değer − dünkü değer) ÷ dünkü değer) × 100` |

---

### 3.3 Dashboard Görselleştirme Modülü

Dashboard aşağıdaki bileşenleri içermelidir:

- KPI kartları
- Zaman serisi grafikleri
- Bar chart
- Donut chart
- Funnel
- Heatmap
- Cohort analiz
- Scatter chart
- Table view
- Pivot view

> Dashboard kullanıcıya özelleştirilebilir olmalıdır.

---

### 3.4 Filtreleme ve Segmentasyon

#### Temel Filtreler

- Tarih aralığı
- Kanal
- Kampanya
- Cihaz
- Ülke / Şehir

#### Gelişmiş Filtreler

- Ciro aralığı
- Sipariş sayısı
- ROAS aralığı
- Conversion aralığı
- Özel segment oluşturma

#### 3.4.1 Segmentasyon

- Kanal bazlı
- Kampanya bazlı
- Davranış bazlı
- Sipariş hacmine göre

#### 3.4.2 Filtre Özellikleri

- Global çalışmalı
- Cross-filter desteklemeli
- URL parametre desteklemeli

---

## 4. Veri Modeli

### `traffic_data`

```sql
date
channel
sessions
users
new_users
bounce_rate
avg_session_duration
pages_per_session
```

### `ads_data`

```sql
date
platform
campaign_name
adset
impressions
clicks
spend
conversions
revenue
```

### `sales_data`

```sql
order_id
date
revenue
items
discount
refund
channel
device
```

### `campaign_data`

```sql
campaign_name
platform
start_date
end_date
budget
```

### `channel_mapping`

```sql
source
medium
channel_group
```

---

## 5. API Uç Noktaları

### Import Endpoints

| Method | Endpoint | Açıklama |
|---|---|---|
| `POST` | `/imports` | Yeni veri import işlemi başlatır (dosya yükleme) |
| `GET` | `/imports` | Import geçmişini listeler |
| `GET` | `/imports/{id}` | Belirli import işleminin detayını getirir |
| `GET` | `/imports/{id}/preview` | Yüklenen verinin önizlemesini gösterir |
| `POST` | `/imports/{id}/map-columns` | Kolon eşleme işlemini kaydeder |
| `POST` | `/imports/{id}/validate` | Import edilen veriyi doğrular |
| `POST` | `/imports/{id}/commit` | Doğrulanan veriyi MySQL'e yazar |
| `GET` | `/imports/{id}/errors` | Hatalı satırları listeler |
| `DELETE` | `/imports/{id}` | Import verisini geri alır (rollback) |

### Mapping Endpoints

| Method | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/mappings/channels` | Kanal eşleme listesini getirir |
| `POST` | `/mappings/channels` | Yeni kanal eşleme ekler |
| `PUT` | `/mappings/channels/{id}` | Kanal eşlemeyi günceller |
| `DELETE` | `/mappings/channels/{id}` | Kanal eşlemeyi siler |

### KPI & Normalizasyon Endpoints

| Method | Endpoint | Açıklama |
|---|---|---|
| `POST` | `/normalize/run` | Verileri standart formata dönüştürür |
| `POST` | `/kpi/run` | KPI hesaplama süreçlerini çalıştırır |
| `GET` | `/kpi/summary` | KPI özet metriklerini döndürür |

### Dashboard Endpoints

| Method | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/dashboard/trend` | Zaman serisi performans verisini getirir |
| `GET` | `/dashboard/channel-performance` | Kanal bazlı performansı getirir |
| `GET` | `/dashboard/platform-performance` | Platform bazlı performansı getirir |
| `GET` | `/dashboard/campaign-performance` | Kampanya bazlı performansı getirir |
| `GET` | `/dashboard/funnel` | Funnel analiz verisini getirir |

### Filtre & Görünüm Endpoints

| Method | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/filters/options` | Filtre seçeneklerini getirir |
| `POST` | `/filters/validate` | Filtre kombinasyonunu doğrular |
| `GET` | `/views` | Kaydedilmiş dashboard görünümlerini listeler |
| `POST` | `/views` | Yeni dashboard görünümü kaydeder |
| `PUT` | `/views/{id}` | Dashboard görünümünü günceller |
| `DELETE` | `/views/{id}` | Dashboard görünümünü siler |

### Segment Endpoints

| Method | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/segments` | Segment listesini getirir |
| `POST` | `/segments` | Yeni segment oluşturur |
| `GET` | `/segments/{id}/preview` | Segment önizlemesini getirir |
| `POST` | `/segments/{id}/apply` | Segmenti uygular ve hesaplar |

### Export Endpoints

| Method | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/export/kpi-summary` | KPI verilerini JSON formatında çıktı verir |
| `GET` | `/export/channel-performance` | Kanal performansını JSON formatında çıktı verir |
| `GET` | `/export/campaign-performance` | Kampanya performansını JSON formatında çıktı verir |
| `GET` | `/export/raw` | Ham veriyi JSON formatında çıktı verir |

### Log Endpoints

| Method | Endpoint | Açıklama |
|---|---|---|
| `GET` | `/logs/imports` | Import loglarını getirir |
| `GET` | `/logs/api` | API loglarını getirir |

---

## 6. Kullanıcı Arayüzü ve Sayfa Yapısı

| Sayfa | İçerik ve Fonksiyonellik |
|---|---|
| **Dashboard** | KPI kartları, zaman serisi grafikler, kanal ve platform dağılım grafikleri, kampanya performans özetleri, filtre paneli, drag-drop yerleşim desteği |
| **Kanal Analizi** | Kanal bazlı ciro, sipariş, dönüşüm oranı ve ROAS analizleri, karşılaştırmalı grafikler, detaylı performans tablosu |
| **Kampanya Analizi** | Kampanya bazlı gelir, harcama, dönüşüm ve ROAS analizleri, kampanya karşılaştırma grafikleri ve sıralama tabloları |
| **Trafik Analizi** | Trafik kaynakları, kullanıcı davranışı metrikleri, bounce rate ve dönüşüm oranı analizleri |
| **Funnel Analizi** | Ziyaret → sepete ekleme → ödeme → satın alma adımlarının görsel analizi ve oran hesaplamaları |
| **Cohort Analizi** | Kullanıcıların ilk etkileşim tarihine göre tekrar satın alma ve retention analizleri |
| **Veri Import** | CSV/XLSX/JSON yükleme alanı, veri önizleme, kolon eşleme, validasyon ekranı, import geçmişi ve hata raporu |
| **Segment Yönetimi** | Kurallı segment oluşturma, segment önizleme, segment bazlı performans analizi |
| **Filtre Yönetimi** | Global filtre ayarları, kayıtlı filtre kombinasyonları, hızlı filtreleme seçenekleri |
| **Kaydedilmiş Görünümler** | Kullanıcıların oluşturduğu dashboard layout ve filtre kombinasyonlarının yönetimi |
| **Export & Raporlama** | KPI, kanal ve kampanya verilerinin CSV/XLSX/JSON olarak dışa aktarımı |
| **Log ve Sistem İzleme** | Import logları, hata logları ve sistem işlem geçmişinin görüntülenmesi |
| **Ayarlar** | Dashboard ayarları, kullanıcı tercihleri, layout sıfırlama seçenekleri |

---

## 7. Güvenlik ve KVKK Uyumu

Sistem aşağıdaki güvenlik prensiplerini desteklemelidir:

- **Veri Maskeleme:** Hassas şirket verileri maskelenebilir olmalıdır.
- **Audit Log:** Sistemde yapılan kritik işlemler loglanmalıdır.
- **Hata Loglama:** API hataları ve yetkisiz erişim denemeleri sistem loglarında kayıt altına alınmalıdır.

---

## 8. Başarı Senaryoları

- Kanal bazlı ROAS düşüşü tespit edilebilmelidir
- Kampanya performansı analiz edilebilmelidir
- Günlük ciro trendi okunabilmelidir
