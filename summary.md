# Sporthink — Ne Yaptık, Neredeyiz?

**Güncel durum:** 4/14 faz tamamlandı. Sırada Faz 5 — KPI Motoru.

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

## Sonraki Adım — Faz 5: KPI Motoru

Import altyapısı tamam. Sırada verilerin anlam kazanacağı katman: KPI hesaplama motoru. `kpi/formulas.js`'te temel hesaplamalar, ardından traffic, ads, sales, channel, campaign, product, cohort modülleri. Ağırlıklı ortalama (bounce rate, pages/session), ROAS hesabı (gelir her zaman orders tablosundan), GA4 item-scope/session-scope ayrımı bu fazın kritik kuralları.
