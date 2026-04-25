# UI/UX Tasarım Notları

Faz 12 sonrası yapılan tasarım gözden geçirmesinden çıkan tespitler.
Faz 14'te veya uygun bir zamanda bu listeye göre karar alınacak.

---

## Tespit Edilen Sorunlar

### 1. Dashboard hiyerarşisi yok — Hero Metric
**Sorun:** 12 KPI kartı eşit ağırlıkta görünüyor, kullanıcı nereye bakacağını bilmiyor.
**Öneri:** En üste 3 büyük "hero" kart (ciro, ROAS, oturum), altına detay kartları.
**Efor:** Küçük — `KpiGrid` bileşeni genişletilir.
**Öncelik:** Yüksek

### 2. Sidebar her zaman tam açık
**Sorun:** Küçük ekranlarda içerik alanı daralıyor.
**Uygulanan (2026-04-25):** Collapse toggle + icon modu uygulandı. `collapsed` state localStorage'a kaydediliyor. `sporthink-icon-red.png` kapalı modda gösteriliyor.
**Öncelik:** ✅ Uygulandı

### 3. Aktif filtre görünür değil
**Sorun:** Kullanıcı hangi filtrenin aktif olduğunu anlamıyor.
**Öneri:** Filtre panelinin altında aktif filtre badge'i — örn. "01 Oca–31 Mar 2025 · Meta · İstanbul"
**Efor:** Orta.
**Öncelik:** Yüksek

### 4. Sayfa isimleri teknik jargon
**Sorun:** "Kohort", "Funnel" pazarlama ekibine yabancı gelebilir.
**Uygulanan (2026-04-25):** "Funnel" → "Dönüşüm Hunisi", "Kohort" → "Müşteri Sadakati" — sidebar ve sayfa başlıkları tutarlı hale getirildi.
**Açık soru:** Bu isimler geçici olarak kabul edildi. Kullanıcı testi veya ekip geri bildirimi sonrası yeniden değerlendirmek üzere not alındı. Alternatif adaylar: "Satış Yolculuğu" / "Alışveriş Yolculuğu" (Funnel için); "Müşteri Bağlılığı" (Cohort için).
**Öncelik:** İzle

### 5. Grafik renk sırası kafa karıştırıyor
**Sorun:** Brand kırmızısı (#EE3423) hem grafik birinci rengi hem negatif/hata rengi — "kırmızı = kötü" algısı oluşuyor.
**Öneri:** Grafiklerde nötr renk (koyu lacivert veya gri) birinci sıraya alınsın; kırmızı highlight ve aksiyon için saklansın.
**Efor:** Küçük — grafik bileşenlerindeki renk sırası güncellenir.
**Öncelik:** Orta

### 6. DataTable çok yoğun — kolon gizle/göster
**Sorun:** Kampanyalar gibi sayfalarda 8 kolon her zaman görünüyor, öncelikli metrikler kaybolup gidiyor.
**Öneri:** Kolon gizle/göster toggle. Sürükle-bırak sıralama sonraki adım (`@tanstack/react-table` zaten projede mevcut).
**Efor:** Orta — `DataTable.jsx`'e eklenir.
**Öncelik:** Orta

### 7. Boş durum mesajları generik
**Sorun:** Her yerde "Veri bulunamadı" — kullanıcı ne yapacağını bilmiyor.
**Öneri:** Bağlamsal mesajlar. Örn: "Bu tarih aralığında Meta verisi yok — filtreyi genişletmeyi deneyin."
**Efor:** Küçük ama sayfa sayfa yazılması gerekiyor.
**Öncelik:** Düşük

### 8. Responsive tasarım yok
**Sorun:** Tüm grid'ler sabit 2 kolon, sidebar mobilde ekranı kapatır.
**Öneri:** Faz 14'te toplu yapılacak — şimdi dokunma.
**Efor:** Büyük — tüm sayfalar + sidebar.
**Öncelik:** Faz 14

### 9. Dark modda sidebar logosu okunamıyor
**Sorun:** Sidebar'da siyah logo (`sporthink-logo-sidebar.png`) dark mod arka planında görünmüyor, sadece kırmızı kısım seçilebiliyor.
**Uygulanan (2026-04-25):** `Sidebar.jsx`'te `isDark` state (MutationObserver) eklendi. Dark modda `sporthink-logo-sidebar-white.png`, light modda `sporthink-logo-sidebar.png` gösteriliyor.
**Öncelik:** ✅ Uygulandı

### 10. Dark modda açıklama metinleri zor okunuyor
**Sorun:** `--color-text-muted` ve `--color-text-secondary` dark modda yeterince açık değil, küçük açıklama yazıları loş kalıyor.
**Uygulanan (2026-04-25):** `index.css` dark mod bloğu: `--color-text-secondary: #B8B8C8`, `--color-text-muted: #808090` olarak güncellendi.
**Öncelik:** ✅ Uygulandı

---

## Öncelik Özeti

| # | Sorun | Efor | Öncelik |
|---|---|---|---|
| 1 | Dashboard hero metric hiyerarşisi | Küçük | Yüksek |
| 2 | Sidebar collapse (icon modu) | Küçük | ✅ Uygulandı |
| 3 | Aktif filtre badge gösterimi | Orta | Yüksek |
| 4 | Sayfa isimlerini Türkçeleştir | Çok küçük | ✅ Uygulandı (izle) |
| 5 | Grafik renk sırası düzenle | Küçük | ✅ Uygulandı |
| 6 | DataTable kolon gizle/göster | Orta | Orta |
| 7 | Bağlamsal boş durum mesajları | Küçük | Düşük |
| 8 | Responsive tasarım | Büyük | Faz 14 |
| 9 | Dark mod sidebar logo (siyah → beyaz) | Çok küçük | ✅ Uygulandı |
| 10 | Dark mod açıklama metni kontrastı | Çok küçük | ✅ Uygulandı |
