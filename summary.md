# Sporthink — Ne Yaptık, Neredeyiz?

**Güncel durum:** 14/14 faz tamamlandı. Proje tamamlandı ✅

---

## Faz 1 — Veritabanı Kurulum ✅ (2026-04-19)

Projenin temelini attık. MySQL 9.6 üzerinde `sporthink` veritabanını oluşturduk ve hazır olan schema dosyasını çalıştırarak 32 tabloyu ayağa kaldırdık. İki küçük uyumluluk sorunu çıktı: MySQL'in `row_number` kelimesini rezerve etmesi ve utf8mb4 encoding'in UNIQUE index'lerde boyut sınırı getirmesi. İkisi de düzeltildi.

Sonrasında `seedDatabase.js` scriptiyle fixture CSV'lerden tüm ham verileri veritabanına yükledik. Siparişler, müşteriler, ürünler, kampanyalar ve reklam verilerinin tamamı doğru satır sayısıyla yerleşti. FK kısıtları ve UNIQUE index'ler manuel test edildi, hepsi beklenen hataları verdi.

Bu aşamada ORM kararını da netleştirdik: basit CRUD işlemleri için Sequelize, KPI hesaplama ve aggregation sorguları için doğrudan mysql2 ile raw SQL kullanacağız.

---

## Faz 2 — Backend Kurulum + Modeller ✅ (2026-04-20)

Node.js + Express sunucusunu sıfırdan kurarak çalışır hale getirdik. JWT tabanlı kimlik doğrulama, rol kontrolü (admin / marketing / viewer), merkezi hata yönetimi ve istek loglama middleware olarak eklendi. API response formatı standartlaştırıldı: her endpoint `{ success, data, meta }` veya `{ success, error }` döndürüyor.

Dört kritik bug'ı çözdük. macOS'ta Sequelize TCP yerine Unix socket üzerinden bağlanmak zorundaydı. `/health` endpoint'i route sırasının yanlışlığından 404 veriyordu. `dbReady` değişkeni tanımlanmadan kullanılıyordu. En can sıkıcısı swagger-jsdoc'tu: startup'ta tüm dosyaları tarayarak sunucuyu donduruyor, test etmeyi imkânsız hale getiriyordu — tamamen lazy load'a taşıdık.

11 model dosyası yazıldı. Tüm testler geçti: sağlık endpoint'i, 401/403 hataları, 404 formatı.

---

## Faz 3 — Import: Parser + Previewer + Validator ✅ (2026-04-20)

Import sisteminin ön katmanını inşa ettik — verinin veritabanına ulaşmadan önce geçtiği ilk üç kapı.

**Mapping config'ler:** 11 veri kaynağının her biri için ayrı bir config dosyası yazdık. Bu dosyalar CSV sütun adlarının karşılık geldiği DB sütunlarını, her sütunun tipini, zorunlu olup olmadığını, hangi tabloya hard FK kontrolü yapılacağını ve duplicate stratejisini tanımlıyor. GA4, Meta, Google, siparişler, ürünler, müşteriler — hepsinin kuralları burada.

**Parser'lar:** CSV, XLSX ve JSON formatlarını destekleyen üç ayrı parser yazdık. CSV parser'da dikkat çeken bir detay: fixture dosyaları UTF-8 BOM karakteriyle başlıyordu ve ilk sütun adı `date` yerine `﻿date` olarak geliyordu. `bom: true` seçeneğiyle kapattık. ga4_traffic.csv için 46.317 satırı doğru okuyor.

**Previewer:** Dosyanın ilk 10 satırını okuyup döndürüyor — veritabanına tek satır yazmıyor. Mapping config'i opsiyonel olarak alıyor ve hangi CSV sütunlarının hangi DB sütunlarıyla eşleştiğini otomatik olarak öneriyor.

**Validator:** İki düzeyli kontrol yapıyor. Önce sütun başlıkları doğrulanıyor: zorunlu bir sütun dosyada yoksa import başlamadan hata veriliyor. Sonra her satır ayrı ayrı kontrol ediliyor: zorunlu alan boşsa, sayı beklenen yere yazı geldiyse hata kaydediliyor. Hatalı satır import'u durdurmıyor — geçerli satırlar devam ediyor, hatalar raporlanıyor.

---

## Faz 4 — Import: Transformer + Mapper + Importer ✅ (2026-04-20)

Import pipeline'ının ikinci ve son katmanını tamamladık. Artık bir CSV dosyası sisteme girdiğinde tüm yol açık: parse → validate → transform → raw INSERT → clean INSERT, ve gerekirse rollback.

`transformer.js` kaynak bazlı çalışıyor. GA4'ün `20241001` formatındaki integer tarihleri `2024-10-01` DATE'ine çevriliyor. Meta'nın yüzde CTR değerleri (`2.25`) 0–1 aralığına normalize ediliyor (`0.0225`). Google'ın mikro birim maliyetleri 1.000.000'a bölünüyor. Her kaynağın kendi özel dönüşüm kuralları ayrı fonksiyonlara ayrıldı.

`mapper.js` mapping config'i okuyarak CSV sütun adlarını DB sütun adlarına çeviriyor. Raw tabloya yazarken orijinal CSV değerleri korunuyor, clean tabloya yazarken dönüştürülmüş ve eşleştirilmiş değerler kullanılıyor.

`duplicateChecker.js` imports tablosunu sorgulayarak aynı tarih aralığına ait tamamlanmış bir import kaydı varsa uyarı döndürüyor. Aynı dönem verisini iki kez yüklemeye karşı koruma sağlıyor.

`importer.js` tüm bu parçaları bir araya getiriyor. mysql2 transaction'ı içinde: validasyon, raw INSERT (500 satırlık batch'ler), transform+map, clean INSERT sırayla çalışıyor. Herhangi bir adımda hata çıkarsa transaction otomatik rollback yapıyor. `imports` tablosunun status alanı her aşamada (`validating` → `committed` / `failed` / `rolled_back`) güncelleniyor. Sequelize bypass edildi — tüm durum güncellemeleri raw SQL ile yapılıyor (macOS socket EPIPE sorununu önlemek için).

Kritik bir teknik keşif: MySQL 9.x ile mysql2'yi macOS'ta kullanırken TCP bağlantısında `ssl:false` zorunlu, yoksa "packets out of order" timeout hatası çıkıyor. Ancak Unix socket üzerinde `ssl:false` tam tersine EPIPE hatasına yol açıyor — bu nedenle iki bağlantı tipi için ayrı konfigürasyon uygulandı.

---

## Faz 5 & 6 — KPI Motoru ✅ (2026-04-21)

KPI hesaplama motorunu MySQL üzerinde çalışacak şekilde iki parçada inşa ettik.
**Faz 5 (Traffic, Ads, Sales):** Temel formüller (`weightedAvg`, `roas`, `growthRate`) `kpi/formulas.js` içine merkezi olarak yerleştirildi. ROAS hesabında kesin bir kural uygulandı: reklam platformlarının kendi gönderdiği ciro verileri asla kullanılmıyor, ciro her zaman kendi siparişler (`orders`) tablomuzdan çekiliyor. Ağırlıklı ortalamalar SQL sorgusu içinde (`SUM(değer * session) / SUM(session)`) hesaplanıyor.
**Faz 6 (Channel, Campaign, Product, Cohort):** Aggregation sorguları oluşturuldu. GA4 `item_interactions` ile `traffic` tablolarının scope farklılıkları nedeniyle asla JOIN edilmemesi kuralı harfiyen uygulandı. Cohort analizi gün bazlı değil ay bazlı (`YYYY-MM`) offset ile çalışacak şekilde geliştirildi. Bütün tablolar başarıyla dolduruldu.

---

## Faz 7 & 8 — REST API Uç Noktaları ✅ (2026-04-22)

Backend API katmanı tamamlandı ve test edildi.
**Faz 7 (Auth + Import):** JWT tabanlı yetkilendirme eklendi (`authController`). Parolalar `bcryptjs` ile şifreleniyor. Import işlemleri için (multer file upload, map columns, validate, commit, rollback) tüm route'lar yazıldı. En önemli karar: Node.js/Sequelize validator modülü uygulamayı çok yavaşlattığı için ORM kullanımı tamamen kaldırılarak `mysql2/promise` yapısına geçildi, DB performansı katlandı.
**Faz 8 (KPI, Dashboard, Export, Logs vb.):** Dashboard trend analizleri, huni (funnel), ürün performans, kayıtlı görünümler (saved_views) ve CRUD işlemleri hazır. Swagger ile 36 adet endpoint otomatik olarak dokümante ediliyor (lazy load ile açılışta donma engellendi).

---

## Faz 9 — Frontend Kurulum + Routing ✅ (2026-04-23)

Vite, React ve Tailwind CSS v4 stack'i ile frontend temelleri atıldı. `vite.config.js` proxy ayarlarıyla backend'e aynı domain üzerinden bağlanıldı. Axios interceptor'ları yazıldı (401 durumunda otomatik logout/login yönlendirmesi). React Router Dom ile 13 ayrı sayfanın taslağı (placeholder) oluşturuldu. Protected ve Public route korumaları tamamlandı.

---

## Faz 10 — Frontend: Filtre Sistemi ✅ (2026-04-24)

React Context kullanılarak global filtre state'i (`hooks/useFilters.js`) kuruldu. URL ile çift yönlü senkronizasyon (`hooks/useUrlSync.js`) sağlandı; sayfayı yenileyince veya URL paylaşıldığında filtreler korunuyor. DateRange, Channel, Campaign, Device ve City filtre bileşenleri yazıldı. Tüm bunları kapsayan ve gelişmiş filtreleri de içeren `FilterPanel.jsx` oluşturuldu. Futura fontları ve tüm logo assets sisteme entegre edildi, Vite build hataları çözüldü.

---

## Faz 11 — Frontend: Dashboard Ana Sayfa ✅ (2026-04-24)

Tüm KPI verilerini tek ekranda toplayan Dashboard sayfasını inşa ettik. Top-down yaklaşım benimsedik: önce sayfa iskeleti, sonra bileşenler ihtiyaç geldikçe yazıldı.

`KpiCard` (skeleton + trend badge) ve `KpiGrid` bileşenleri oluşturuldu. Chart bileşenleri yazıldı: `LineChart` (ciro+oturum trendi), `BarChart` (kampanya karşılaştırma), `DonutChart` (kanal dağılımı), `ScatterChart` (ROAS vs harcama). Her biri kendi loading skeleton ve "Veri bulunamadı" empty state'ini yönetiyor. `DataTable.jsx` sıralama ve sayfalama destekli yazıldı. `utils/format.js`'te Türkçe locale formatlamaları (para, yüzde, ROAS, süre) tanımlandı.

Dashboard 12 KPI kartı + 4 grafik + 1 kampanya tablosundan oluşuyor. Tüm bileşenler `useFilters`'a bağlı — filtre değiştikçe API çağrıları otomatik tetikleniyor. Donut'ta kanala tıklayınca cross-filter aktif oluyor. Trend okları için seçili dönem ile önceki aynı uzunluktaki dönem paralel API çağrısıyla karşılaştırılıyor. İlk açılışta veritabanının gerçek tarih aralığı çekilerek filtre güncelleniyor.

---

## Faz 12 — Frontend: Analitik Sayfalar ✅ (2026-04-24)

5 derinlemesine analitik sayfa yazıldı.

**Traffic:** Oturum, kullanıcı, hemen çıkma, ortalama süre KPI kartları. Oturum+kullanıcı trend çizgi grafiği. Kanal bazlı oturum bar grafiği.

**Channels:** Kanal gelir dağılımı donut (cross-filter aktif), ROAS bar, ciro vs harcama karşılaştırması, tüm metriklerin DataTable'ı.

**Campaigns:** Meta vs Google yan yana KPI kartları, top 10 kampanya yatay bar, ROAS vs harcama scatter, 8 kolonlu kampanya tablosu.

**Funnel (Dönüşüm Hunisi):** 6 adımlı huni grafiği için `FunnelChart.jsx` yazıldı (`chartjs-chart-funnel` kullanılıyor). Adım detay paneli tıklanabilir; renk degradesiyle dönüşüm oranları gösteriliyor.

**Cohort (Müşteri Sadakati):** `HeatmapChart.jsx` (`chartjs-chart-matrix`) ile retention heatmap. Kohort bazlı özet kartlar ve ay x offset DataTable.

Tüm sayfalar `useFilters` ile entegre ve filtre değiştikçe verilerini güncelliyor.

---

## Faz 13 — Frontend: Sistem Sayfaları ✅ (2026-04-25)

6 operasyonel sayfa oluşturuldu.

**Import:** Drag-drop dosya yükleme, kaynak tablo seçimi. Yükleme sonrası 10 satır önizleme tablosu. Commit ve rollback butonları. Import geçmişi listesi; her import'un hatalı satırları açılır panel olarak gösteriliyor.

**Segments:** Kanal/kampanya/şehir kurallarından oluşan segment tanımları. Kaydetmeden önce inline önizleme: "X sipariş, Y müşteri eşleşiyor."

**Views:** Mevcut filtre durumunu ve dashboard düzenini kaydeden saved_views CRUD. Görünümü yükleyince filtreler otomatik uygulanıyor.

**Export:** 7 KPI/aggregation tablosu için tarih filtreli JSON indirme.

**Logs:** Denetim logları ve API logları iki sekmeli. Server-side sayfalama.

**Settings:** Dark mode toggle (localStorage + `document.documentElement.classList`). Hesap bilgileri (e-posta, rol, son giriş).

Bu fazda `App.jsx`'e dark mode başlatma `useEffect`'i eklendi. Faz boyunca üç kritik bug çözüldü: kampanya filtresi obje yerine string render edince uygulama çöküyordu; backend kampanya endpoint'inde sütun adı hatalıydı; tüm yeni sayfalarda response format yolları güncellendi.

---

## Faz 14 — Uçtan Uca Test + Final ✅ (2026-04-25)

Projenin son fazında UX polish ve kapsamlı testler yapıldı.

**Dashboard hero metrik hiyerarşisi:** FilterPanel'in hemen altına 3 büyük hero kart eklendi (Toplam Ciro, Genel ROAS, Oturumlar). `KpiCard`'a `hero` prop eklendi — daha büyük yazı tipi (38px), daha geniş boşluklar, brand rengiyle çerçeveleme. Detay KPI kartları (9 adet) aşağıda gruplandı.

**Aktif filtre badge:** `FilterPanel`'in altına `ActiveFilterSummary` bileşeni eklendi. Aktif tarih aralığı, kanal, kampanya, cihaz ve şehir filtrelerini chip olarak gösteriyor. Tarih dışındaki chipler tıklanarak kaldırılabiliyor.

**Dark mod düzeltmeleri:** Sidebar'da dark/light logo otomatik değiştirme, collapse/expand toggle ve dark modda daha okunabilir metin tonları önceki fazlarda uygulanmıştı; bu fazda doğrulandı ve ux_notes.md'de kapatıldı.

Uçtan uca testler: Auth akışı, KPI metrikleri, tarih filtreli trend ve kanal verileri, funnel adımları, audit logları, export, boş tarih aralığı (uygulama çökmüyor), geçersiz token ve yanlış şifre hataları, Organic ROAS=null, bounce rate weighted avg — hepsi doğrulandı.
