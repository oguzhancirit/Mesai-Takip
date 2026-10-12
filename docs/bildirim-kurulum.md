# Mesai Takip bildirimleri

Bu değişiklik yalnız isteğe bağlı bildirim sistemini içerir. Performans, Güncelle duyurusu ve Telefonunda dene bölümleri geri alındı. Mesai hesapları, `molaTakip:v1`, kayıt biçimi, CSV, manifest adresi/kapsamı ve mevcut kullanıcı geçmişi korunur.

| Bildirim | Zaman / koşul |
|---|---|
| Mola | Açık mola 15 dakika |
| Çıkış | 18:30, mesai hâlâ açıksa |
| Giriş | Hafta içi 08:30, giriş yoksa; izin/tatilde gönderilmez |
| Haftalık özet | Cumartesi 10:00 |
| Canias | Perşembe 14:00, girilmeyi bekleyen dış görev varsa |
| Günlük hedef | Hedef ve çekirdek saat tamamlanınca; açık mola sırasında gönderilmez |
| Eksik kayıt | Cuma 16:00, geçmiş günlerin eksik çıkışı varsa |

Son iki bildirim varsayılan kapalıdır. Mevcut beş tercih ve izinler korunur. Bildirimler kısa başlık ve bir kısa cümle kullanır. Bağlantıyı doğrulamak için yalnız Deneme gönder düğmesi kalır.

## Yayın ve kayıt koruma

Bildirim servisi mevcut Sites hesabında ayrı olarak public yayınlandı: https://mesai-takip-bildirimler.ozicirit9.chatgpt.site . Yeni hesap gerekmez; VAPID özel anahtarı Sites secret olarak kalır ve değişmez. Ana mesai geçmişi sunucuya gönderilmez; yalnız cihaz aboneliği, tercihler ve gereken durum/toplamlar kullanılır. Yeni isteğe bağlı tercihler ve özet alanları eski istemcilerde yoksa kapalı/boş varsayılır. Test örnek kapısı ve örnek gönderici kaldırıldı; daha önce uygulanmış D1 migration dosyaları ve eski test tablosu veri geçiş geçmişi için korunur, örnekler gönderilmez.

Upstream main'e merge sonrası `.github/workflows/mesai-notifications.yml` yaklaşık beş dakikada bir gerçek hatırlatmaları kontrol eder. İmzalı GitHub OIDC kimliği tam repo, dal ve workflow ile doğrulanır. Fork `test` dalındaki ayrı kontrol, bir saatlik test oturumu boyunca yalnız gerçek kuralları çalıştırır. Fork yayını: https://oguzhancirit.github.io/Mesai-Takip/ . Bu test oturumu kalıcı cron değildir. GitHub yoğunluğunda gecikme olabilir; public repo 60 gün etkinlik olmazsa zamanlayıcı durabilir. Çevrimdışı kapanış, eşitlenene kadar fazladan uyarı oluşturabilir.

Sunucu kaynağı ayrıca Sites'e yayınlanır; GitHub merge'i sunucuyu kendiliğinden güncellemez. Main'e doğrudan push/merge yapılmaz; Berkay incelemesi ve kullanıcı merge'i beklenir. PWA'yı silmek veya adresini değiştirmek gerekmez.

## Kontrol

`node tests/lunch.cjs`, `node tests/stress.cjs`, `node tests/notifications-client.cjs`, `node tests/notifications-sw.cjs`, `node --test notifications-site/tests/*.test.mjs`.

Perşembe Canias, cuma gönderilmemesi, izinli gün, hedefe ulaşma/açık mola/kapalı mesai, eski bildirim tercihleri ve dokuz cihazda mesai verisinin bayt düzeyinde korunması denetlenir. Fiziksel telefon teslimi ayrıca kontrol edilir.
