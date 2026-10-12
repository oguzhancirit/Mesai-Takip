# AGENTS.md

Mesai Takip: giriş, çıkış, dış görev ve mola takibi yapan, telefona kurulabilen tek sayfalık bir PWA. Arayüz dili Türkçe.

## Proje yapısı

Build adımı, paket yöneticisi ve bağımlılık yok. Dosyalar olduğu gibi statik olarak servis edilir.

- `index.html`: uygulamanın tamamı. CSS `<style>` içinde, JS tek bir IIFE olarak `<script>` içinde.
- `sw.js`: service worker. Sayfa için network-first, diğer aynı origin dosyaları ve Google Fonts için cache-first.
- `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`: PWA kurulum dosyaları.
- `tests/`: Node ile çalışan testler (`harness.cjs`, `lunch.cjs`, `stress.cjs`). Uygulamaya ait değil, `sw.js` `CORE` listesine eklenmez.
- `docs/stress-test-raporu.md`: karma gün ve hata testlerinin raporu.

`index.html` içindeki JS bölümleri `// ---------- storage ----------` gibi başlıklarla ayrılmış: storage, time helpers, interval helpers, day model, html pieces, render, actions, export / import.

## Yerelde çalıştırma

```sh
python3 -m http.server 8000
```

Service worker sadece `https:` üzerinde kaydedilir (`index.html` içindeki `location.protocol === "https:"` kontrolü), bu yüzden yerelde offline/cache davranışı test edilemez. Manifest ve service worker sadece sayfa tek başına açıldığında eklenir (`STANDALONE`), claude.ai artifact içinde açıldığında eklenmez.

Testler paket kurulumu gerektirmez, repo kökünde çalıştırılır:

```sh
node tests/lunch.cjs
node tests/stress.cjs
```

Testler `index.html` içindeki gerçek JS'i Node VM'de, sahte saat ve DOM taklitleriyle çalıştırır. Hesaplama kuralı değişirse test beklentilerini de güncelle. Gerçek tarayıcı, ekran yerleşimi ve telefonun arka plan davranışı bu testlerle doğrulanmaz. Değişikliği tarayıcıda da elle doğrula: giriş/çıkış, dış görev, mola, geçmiş gün düzenleme, izin işaretleme, CSV dışa/içe aktarma. Mevcut veriyle test etmek için önce gerçek bir CSV yedeği alıp geri yükle.

## Kurallar

### Git: main'e doğrudan push yok

- `main` branch'ine asla doğrudan commit atma veya push etme.
- Her iş için güncel `main`'den ayrı bir branch aç (`feat/...`, `fix/...`, `chore/...`).
- Değişiklik `gh pr create` ile PR açılarak `main`'e alınır. Merge'i kullanıcı yapar.

### Her değişiklikte service worker cache versiyonunu artır

- `sw.js` başındaki `const CACHE = "mesai-takip-vN";` değerini her PR'da bir artır (ör. `v3` → `v4`). Sadece doküman değişen PR'lar hariç.
- Bunu yapmazsan kurulu uygulamalar eski ikonları, manifesti ve fontları cache'ten sunmaya devam eder; eski cache'ler sadece versiyon değişince silinir.
- Yeni bir statik dosya eklersen `sw.js` içindeki `CORE` listesine de ekle.

### localStorage veri yapısını bozma, kullanıcı verisi silinmesin

Kullanıcıların tüm geçmişi tarayıcıdaki tek bir anahtarda duruyor. Bu veri kaybolursa geri getirilemez.

- Anahtar `molaTakip:v1`. Adını değiştirme. Demo modu ayrı anahtar kullanır (`mesaiTakip:demo`); `DEMO` sabiti `false` kalmalı.
- `localStorage.clear()`, `removeItem` veya mevcut veriyi boş state ile ezen kod ekleme.
- Mevcut alanları yeniden adlandırma, tipini değiştirme veya silme. Yeni alan gerekiyorsa isteğe bağlı ekle ve `norm()` / `normSet()` içinde varsayılan değer ver, böylece eski kayıtlar da okunur.
- `norm()` içindeki eski format dönüşümlerini (gün olarak sadece mola dizisi, `in`/`out` alanları) ve `normSet(p.set || p)` geri uyumluluğunu kaldırma.
- Format değişikliği şartsa önce eski veriyi okuyup yeni formata çeviren bir geçiş yaz. Yükleme sırasında oluşan hata kullanıcının verisini sıfırlamamalı.

Mevcut yapı:

```js
{
  days: {
    "YYYY-MM-DD": {                 // yerel saat diliminde gün anahtarı
      segs:   [{ t: "o" | "g", s: ms, e: ms | null }],  // o = ofis, g = dış görev, e null = devam ediyor
      breaks: [{ s: ms, e: ms }],
      izin:   boolean,              // çekirdek saat ihlali için mazeret izni girildi
      type:   "normal" | "yillik" | "rapor" | "tatil"
    }
  },
  open: ms | null,                  // açık molanın başlangıcı
  set: { mesaiS, mesaiE, coreS, coreE, lunchS, lunchE }  // gece yarısından itibaren dakika; lunchS/lunchE null olabilir
}
```

Zamanlar epoch milisaniye. Boş günler (`isEmpty`) kaydedilmeden silinir.

Aynı yapı claude.ai bulut modunda (`connect()`) `data/users/<uid>/` altına yazılır: her gün `d-YYYY-MM-DD`, açık mola `state`, ayarlar `settings` dokümanı. Bu yol ve alanlar da aynı kurala tabi.

CSV yedeği kullanıcının tek dışa aktarma yoludur. İçe aktarma sütunları Türkçe başlık adına göre bulur (`Tarih`, `Ofis`, `Dış görev`, `Gün türü`, `Mazeret izni`, eski `Giriş`/`Çıkış`, `Molalar` bölümü). Bu başlıkları değiştirirsen eski yedekler geri yüklenemez; değiştirmen gerekirse içe aktarmada eski adları da tanımaya devam et.

## Kod stili

- Mevcut stile uy: kısa yardımcı fonksiyonlar, `$` ile `getElementById`, HTML string birleştirme ile render, harici kütüphane yok.
- Renkler `:root` üzerindeki CSS değişkenlerinden gelir; açık ve koyu tema bloklarının ikisini de güncelle.
- Kullanıcıya görünen tüm metinler Türkçe. Tarihler `tr-TR` ile biçimlendirilir.
- Hesaplama kuralları arayüzdeki açıklama metinleriyle (ör. Özet altındaki not, Ayarlar altındaki hedef metni) tutarlı olmalı; birini değiştirirsen diğerini de güncelle.

## Proje bağlamı

> **Repo durumu (2026-10-11):** Repodaki `index.html` aşağıda anlatılan v3 arayüzüdür (sekmeler, takvim, alt düzenleme paneli, "Günün akışı", dakikaya yuvarlama, demo modu ve `window.__mt` kancaları dahil). Sonradan eklenenler: takvimde dış görev çizgisi, molaları elle ekleme/düzeltme, tuvalet molası ve Canias hatırlatıcısı. Aşağıdaki bölüm sohbet dönemine ait bir özettir; kodla çeliştiği yerde kod esastır.

> Bu bölüm, uygulamanın claude.ai sohbetinde geliştirildiği dönemin özetidir. Kesin olmayan noktalar "(emin değilim)" ile işaretlidir.

### 1. Amaç ve kullanıcılar

- **Mesai Takip**, kişisel bir giriş/çıkış, mola ve dış görev takip uygulaması. Telefondan, elle basılarak kullanılır.
- Amaç: Çalışma süresi, mola ve çekirdek saat ihlalleri için kişinin kendi bağımsız kaydını tutmak.
- Birkaç kişi aynı linki kullanır ama **herkesin verisi sadece kendi cihazında** tutulur. Kimse başkasının verisini göremez, ortak bir sunucu ya da veritabanı yoktur.
- Arayüz dili Türkçe, hedef cihaz telefon (dar ekran, tek elle kullanım).

### 2. Mesai kuralları ve hesaplama

**Kurallar:**
- Asıl mesai: **08:00–17:30**
- Çekirdek saat: **08:30–16:30**. Bu aralıkta iş başında olmak zorunlu. Dışarıda kalınan süreler ihlal sayılır ve ihlal için **mazeret izni** girilmesi gerekir.
- Çekirdek saat dışındaki eksikler başka bir gün tamamlanabilir.
- Yemek arası **ofiste 12:00–13:00 (1 saat)**, **dış görevde 12:00–12:30 (30 dk)**. Mola verilsin ya da verilmesin çalışma sayılmaz.
- **Net hedef her durumda 8,5 saat** (hafta içi). Ofiste yemek dahil 9,5 saat (08:00–17:30), dış görevde yemek dahil 9 saat (07:30–16:30; 08:00'de başlanırsa 17:00) kalınır.
- Yemek arasında ofisle dış görev arasında geçilirse: ilk 30 dk her durumda yemek sayılır, kalan 30 dk ofiste geçtiyse yemek, dış görevde geçtiyse çalışma sayılır. Örnek: 07:30–13:00 dış görev, 13:00–16:30 ofis = 30 dk düşülür, fark 0. 12:30'da dış görevden ofise dönülürse 1 saat düşülür.
- Not: Daha önce "08:30'da başlayan mesaiye 09:00'a kadar gelinebilir" şeklinde farklı bir tarif de verilmişti. Bu iki tarif arasındaki ilişki (eski kural mı, aynı kuralın farklı anlatımı mı) belirsiz (emin değilim). Uygulama yukarıdaki tarifi kullanıyor.
- Hafta sonu (cumartesi/pazar): Hedef yok, çalışılan sürenin tamamı artı yazılır, **yemek arası düşülmez**, çekirdek saat kontrolü yok.
- Yıllık izin, rapor, resmi tatil: Hedef yok, çekirdek saat kontrolü yok, fark 0. O gün çalışılırsa tamamı artı yazılır.

**Uygulamanın hesaplama mantığı:**
- Gün, parçalardan (`segs`) oluşur: her parça ya **ofis** (`o`) ya da **dış görev** (`g`), başlangıç ve bitiş saatiyle. Aynı gün içinde birden fazla parça olabilir (ör. 08:30–12:00 dış görev, 13:00–17:30 ofis).
- **Net çalışma** = tüm parçaların birleşimi (çakışan parçalar çift sayılmaz) eksi yemek arasıyla örtüşen süre. Yemek arasının ilk 30 dk'sı her zaman düşülür; kalan kısmı sadece dış görev parçasıyla örtüşüyorsa düşülmez (`workLunch`).
- **Molalar çalışma süresinden düşülmez.** Bu bilinçli bir karar. Molalar sadece ayrıca takip edilir ve toplanır.
- Mola sayımı: Sadece ofis parçalarının içinde kalan kısım sayılır; yemek arasına, dış göreve ya da kayıt olmayan boşluğa denk gelen kısım sayılmaz (ör. 12:40–13:25 molası 25 dk sayılır). Üst üste binen molalar bir kez sayılır. Dış görevdeyken ve yemek arasında mola başlatılamaz.
- Yemek arasından önce başlayan açık mola, yemek başlangıcında (12:00) kendiliğinden kapanır ve o saate kadar kaydedilir (11:50 molası 10 dk). Dönüş 13:00'ten sonra olsa da yemek sonrası kısım kaydedilmez.
- **Fark** = net çalışma − günlük hedef. Sadece tamamlanmış günler (açık parçası olmayan günler) farka dahil edilir.
- **Çekirdek saat ihlali** = çekirdek saat aralığı (yemek arası hariç) içinde ofiste ya da dış görevde olunmayan boşluklar. Türleri: "Geç giriş", "Erken çıkış", "Çekirdek saatte yok". Bugün için ihlal canlı hesaplanır.
- Hiç kaydı olmayan hafta içi günler ihlal sayılmaz (izin/rapor günleri boşuna ihlal yazmasın diye).
- Mazeret izni gün bazında bir işarettir (`izin: true`). İhlali sayımdan çıkarmaz, sadece "izin bekleyen" uyarısını kaldırır.
- Kullanıcının onayladığı kararlar (2026-10-11), değiştirme:
  - Resmi tatil / izin / rapor günlerinde çalışılırsa yemek arası **düşülür** (hafta sonundan farklı olarak). Ör. tatilde 08:00–17:30 = +8,5 saat.
  - Çekirdek saat içindeki molalar **ihlal sayılmaz**.
  - Bugün erken çıkılırsa ihlal süresi çekirdek saat bitene kadar **canlı artar** ve gün sonunda kesinleşir (15:00 çıkışı 15:30'da 30 dk, 16:30'da 90 dk). Bu sırada türü "Çekirdek saatte yok" görünür, çekirdek saat bitince "Erken çıkış" olur.
- Mesai, çekirdek saat ve yemek saatleri Ayarlar'dan değiştirilebilir. Hedef, mesai süresi eksi yemek arası olarak türetilir.

### 3. Önemli kararlar ve nedenleri

**Teknik yapı**
- Tek bir bağımsız `index.html` (HTML + CSS + vanilla JS), derleme adımı yok. Ek dosyalar: `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`.
- Yayın: **GitHub Pages**, repo adı `Mesai-Takip` (büyük/küçük harf önemli, Pages yolu da böyle), dosyalar repo kökünde. Kullanıcılar linki açıp "Ana ekrana ekle" ile PWA olarak kuruyor.
- Service worker: Sayfa için önce ağ, sonra önbellek (güncellemeler gelsin diye); diğer dosyalar önbellekten. **Her sürümde `sw.js` içindeki `CACHE` adı artırılmalı** (güncel değer `sw.js` başında).
- Veri: `localStorage` anahtarı **`molaTakip:v1`** (tarihsel nedenle ismi "mola" kaldı, değiştirilmemeli). Uygulama `navigator.storage.persist()` istiyor.
- Kod hem claude.ai artifact'ı hem bağımsız site olarak çalışacak şekilde yazıldı: `window.claude` varsa ve kullanıcı sayfanın sahibiyse veriler hesaba senkronize ediliyor. Yoksa sadece localStorage. Bağımsız mod tespiti: `!window.claude && window.top === window`. Claude Code'da geliştirmeye devam ederken artifact tarafındaki `window.claude` kodu kaldırılabilir (emin değilim, kullanıcıyla netleştirilmeli).

**Veri modeli**
- `state = { days, open, set }`
- `days["YYYY-MM-DD"] = { segs:[{ t:"o"|"g", s:ms, e:ms|null }], breaks:[{ s, e }], izin:bool, type:"normal"|"yillik"|"rapor"|"tatil" }`
- `open` = devam eden molanın başlangıcı (ms) ya da `null`.
- `set = { mesaiS, mesaiE, coreS, coreE, lunchS, lunchE }`, gece yarısından itibaren dakika cinsinden. Yemek arası `null` olabilir (kaldırılmış).
- Eski formatlar okunurken otomatik çevriliyor: sadece mola dizisi, `{ in, out, breaks }` ve üst seviyedeki `target`/`lunchS`/`lunchE`. Eski `target` (570 dk) ayarı artık kullanılmıyor, hedef mesai saatlerinden türetiliyor.
- Zaman damgaları **dakikaya yuvarlanarak** saklanıyor. Saniye hassasiyeti CSV yedeğinden geri yüklemede 1 dakikalık sapmalara yol açıyordu.
- Bir günde en fazla bir açık parça olabilir. Geçmiş günlerde bitiş saati boş bırakılamaz.

**Davranış kararları**
- Onay gerektiren işlemler (silme, erken çıkış, mola iptali) **iki dokunuşla** onaylanıyor: ilk dokunuşta buton kırmızıya dönüp metni değişiyor, 3,5 sn içinde ikinci dokunuş işlemi yapıyor. Neden: `confirm()`/`alert()` artifact iframe'inde engelliydi. Ayrıca mesajlar `alert` yerine alt kısımda kısa "toast" olarak gösteriliyor.
- Çekirdek saat bitmeden çıkış yapılırsa onay isteniyor ("Erken çıkış, onayla").
- **Gün kapatıldıktan sonra ana butonlar gizleniyor** (aynı güne tekrar "İşe geldim / Dış görevdeyim" yok). Düzeltme sadece günün kayıt panelinden yapılıyor. Yanlışlıkla kapatılan gün, son parçanın bitiş saati silinerek yeniden açılabiliyor.
- 1 dakika içinde ofis/dış görev arasında geçiş yapılırsa yeni parça açılmıyor, açık parçanın türü düzeltiliyor (0 dakikalık kayıt oluşmasın diye).
- İzin/rapor/tatil tarih aralığıyla işaretlendiğinde hafta sonları atlanıyor. En fazla 60 gün.
- Yedekleme: CSV dışa aktarma (`;` ayraçlı, UTF-8 BOM, Türkçe başlıklar, Excel uyumlu) ve geri yükleme. Geri yükleme birleştirme yapıyor; aynı dosyayı iki kez yüklemek kaydı çoğaltmıyor.
- Geri yükleme kuralları: Bozuk dosya (geçersiz saat/tarih, bitişi başlangıçtan önce kayıt, dosyanın kendi içinde çakışan kayıtlar) tamamen reddedilir, hiçbir gün kaydedilmez. Cihazdaki kayıttan farklı olan gün (farklı çıkış, farklı mola, çakışan kayıt) atlanır, cihazdaki korunur, diğer günler yüklenir ve atlanan günler mesajda listelenir. Yedekte açık, cihazda kapalı olan kayıt çelişki sayılmaz (gün içinde alınan yedek).
- Ofis ve dış görev kayıtları elle eklenirken ya da düzeltilirken üst üste binemez. "Tüm gün dış görev" kısayolu sadece boş günde çalışır ve 08:00–17:00 kaydı oluşturur.

**Arayüz (v3)**
- Altta 4 sekme: **Bugün, Kayıtlar, Özet, Ayarlar**.
- Bugün: Duruma göre değişen tek bir ana kart (en fazla 2 buton + 1 link), aynı anda tek uyarı, altında "Günün akışı" listesi.
- Kayıtlar: Aylık takvim (renk kodlu), aylık özet kutuları, haftalık tablo. Bir güne dokununca alttan düzenleme paneli açılıyor; düzenleme sadece burada.
- Takvim renkleri: artıda yeşil, eksikte kırmızı, çıkışı eksik turuncu kesikli, yıllık izin mavi, rapor mor, resmi tatil turuncu; altta mavi çizgi = dış görev; dolu kırmızı nokta = izin girilmemiş ihlal; boş kırmızı halka = izin girilmiş ihlal.
- Özet: Hafta / ay / tümü; fark, net çalışma, mola, ihlal, dış görev günleri, fark grafiği, çıkışı eksik günler ve mazeret izni bekleyen günler. Bekleyen sayısı menüde rozet olarak görünüyor.
- Görsel: Archivo fontu, açık/koyu tema renk değişkenleri, 320 px genişliğe kadar test edildi.

**Demo modu**
- `const DEMO = true` ile demo sürümü üretiliyor. Ayrı localStorage anahtarı (`mesaiTakip:demo`), sayfa yenilenince sıfırlanıyor, senkronizasyon kapalı.
- 6 haftalık, 30'dan fazla senaryolu örnek veri üretiliyor. Her günün panelinde "Demo senaryosu: …" notu var.
- Test kancaları (`window.__mt`) sadece demo modunda açık.
- Sohbet sırasında Playwright ile 25 hesaplama + 36 arayüz testi çalıştırıldı (hepsi geçti). Bu Playwright betikleri repoda yok. Yerine `tests/` altındaki Node testleri eklendi; gerçek tarayıcıda arayüz testi hâlâ yok.

### 4. Denenip vazgeçilen ya da sorun çıkaranlar

- **claude.ai artifact linkiyle paylaşım:** Hesabı olmayan ya da sahibi olmayan kullanıcılar için veriler iframe içindeki tarayıcı depolamasında tutuluyordu ve tarayıcı kapanınca siliniyordu (özellikle iPhone Safari). Bu yüzden GitHub Pages'te bağımsız PWA'ya geçildi.
- **`confirm()` / `alert()`:** Artifact iframe'inde çalışmadı, "yanlışlıkla bastım, iptal et" butonu tepkisiz kaldı. İki dokunuşla onay ve toast'a geçildi.
- **Onay butonu hatası:** İkinci dokunuş onay yerine yok sayılıyordu ("Yine de çık" basılmıyordu). Düzeltildi.
- **`hidden` özelliği** buton CSS'i tarafından eziliyordu, gizli butonlar görünüyordu. `[hidden]{display:none !important}` eklendi.
- **320 px'de yatay taşma:** Grid sütunları `minmax(0,1fr)` yapılarak düzeltildi.
- **CSV geri yükleme:** 1 dakikadan kısa parçalar geri yüklenince "çıkışı eksik" kayda dönüşüyordu; saniye hassasiyeti 1 dk sapma yaratıyordu. İkisi de düzeltildi.
- **Çıkışı eksik günler** sessizce hesap dışında kalıyordu. Artık takvimde, üst uyarıda ve Özet'te gösteriliyor.
- **GitHub'a yükleme:** Klasörün kendisi yüklenince `index.html` bir alt klasörde kaldı. Dosyalar klasörün içinden seçilip repo köküne yüklenmeli.
- **Android APK (Capacitor) / iOS uygulaması:** Konuşuldu, yapılmadı. iOS için yıllık 99$ geliştirici hesabı gerekiyor. PWA yeterli görüldü.

### 5. Yapılmamış, aklımızdaki özellikler ve açık sorular

**Yayın durumu**
- GitHub Pages `main` dalının kökünden yayınlanıyor. `main`'e merge edilen her değişiklik doğrudan kullanıcılara çıkar; v3 arayüzü yayında.
- Hesaplamayı ya da veri yapısını değiştiren sürümlerden önce kullanıcılara CSV yedeği aldırılması öneriliyor.

**Önerilmiş ama yapılmamış**
- Gün türü olarak **yarım gün izin** ve **arife** (13:00'ten sonrası tatil).
- Uygulama kapalıyken bildirim (çekirdek saat yaklaşınca, çıkış unutulunca). Basit PWA'da yapılmadı; push bildirim altyapısı gerekir.
- Cihazlar arası senkronizasyon: Bağımsız sürümde veri tek cihazda. Telefon değişiminde CSV yedeği ile taşınıyor.
- Harici bir giriş/çıkış sisteminin (PDKS) raporunu içe aktarıp gün gün fark gösterme. Özellik olarak istenmedi (emin değilim).
- Hafta sonu ve fazla çalışma kayıtları için ayrı bir rapor (emin değilim).
- Gerçek tarayıcıda çalışan arayüz testleri (hesaplama testleri `tests/` altında var).

## Sites bildirimleri (taslak)

- `notifications.js`, `notification-rules.js`, `notifications-config.js` isteğe bağlı bildirim istemcisidir. `available:true` yayınlanmış servise erişir. Bildirimler dışındaki performans ve sürüm güncelleme eklemeleri geri alındı. Canias perşembe 14:00; Günlük hedef ve Eksik kayıt isteğe bağlıdır.
- `notifications-site/` ayrı Sites sunucusunun inceleme kaynaklarıdır; `docs/bildirim-kurulum.md` canlı durum ve yayın adımlarını belirtir. GitHub merge'i Sites sunucu kaynağını kendiliğinden yayınlamaz.
- `.github/workflows/mesai-notifications.yml` upstream main kimliğiyle beş dakikalık kontrol yapar. OIDC depo ID'si ve workflow yolu kontrolü gevşetilmez. Özel VAPID anahtarını git'e ekleme.
- Bildirim istemcisi mesai kaydını yazamaz. `molaTakip:v1` ve mevcut GitHub Pages adresi korunur; ham mesai geçmişi sunucuya gönderilemez.
- Bildirim testleri: `node tests/notifications-client.cjs`, `node tests/notifications-sw.cjs`, `node notifications-site/tests/service.test.mjs`, `node notifications-site/tests/crypto.test.mjs`. Bunlar gerçek iPhone teslimini doğrulamaz.
