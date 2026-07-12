@plan.md

`plan.md` bu projenin güncel tutulan mimari/durum özetidir — kod yazmaya
başlamadan önce buradaki bilgiyi kullanın (dosya yapısını yeniden keşfetmek
yerine). Projede mimariyi etkileyen bir değişiklik (yeni servis/tablo, tema
kuralı, bilinen bir tuzak, kırılan bir varsayım) yaptığınızda `plan.md`'yi de
güncelleyin — bu dosya elle senkronize tutulur, otomatik türetilmez.

## Ajan / model dağıtım politikası

`B2B.API`, `B2B-Web` veya `B2B.Database` projelerinden birinde geliştirme
yapılacaksa işi tek bir ajanda yürütmeyin — önce yapılacak işi planlayın
(gerekirse plan modu / Plan agent ile), sonra alt görevleri projeye özgü ayrı
ajanlara (Agent tool, uygun `model` override'ı ile) dağıtın. Model seçimi:

- **B2B-Web (frontend/UI):**
  - Basit/küçük tasarım işleri (tek bileşen, stil/renk ayarı, küçük ekran) →
    `haiku` veya `opus` — ikisi arasındaki seçimi **fable**'a bırakın (önce
    fable'a hangisinin uygun olduğunu sorun, sonra o modelle ajanı başlatın).
  - Genel yapı değişikliği (birden çok ekranı/route'u etkileyen orta-büyük
    değişiklik) → `sonnet`.
  - Projenin tamamını etkileyen mimari kararlar (tema sistemi, routing
    yapısı, veri katmanı deseni gibi frontend'in geneline yayılan
    değişiklikler) → `fable`.
- **B2B.API (backend):**
  - Basit işler (tek endpoint, DTO ekleme, tek servis metodu) → `haiku`
    veya `opus`.
  - Genel işler (birden çok servisi/controller'ı etkileyen değişiklikler) →
    `sonnet`.
- **B2B.Database:**
  - İşin basit/orta/ileri seviyeden hangisi olduğuna ve dolayısıyla hangi
    modelin kullanılacağına **fable** karar versin.

Bu politika sadece model seçimini yönlendirir; ajanları gerçekten paralel mi
yoksa sıralı mı çalıştıracağınıza (bağımsızlık, blast radius) her zamanki
gibi ayrıca karar verin.

## plan.md senkronizasyonu — her geliştirme turunun zorunlu son adımı

Ajanlara dağıtılan işler tamamlandığında, kullanıcıya "tamamlandı" demeden
ÖNCE şunu kontrol edin: yapılan değişikliklerden herhangi biri mimariyi,
kurulum/deploy sürecini, bilinen bir tuzağı veya var olan bir varsayımı
etkiliyor mu? Etkiliyorsa `plan.md`'yi SİZ güncelleyin — bunu bir alt ajana
bırakmayın (ajanlar plan.md'nin genelini görmeden dar kapsamlı çalışır,
neyin "mimariyi etkilediğine" karar veremez) ve atlamayın (ajanlar kod
değişikliğini yapıp bitirir, dokümantasyonu kendiliğinden güncellemez).
Trivial/lokal düzeltmeler (tek metodluk null-check, tek satırlık string
düzeltmesi gibi) plan.md'ye girmez — plan.md bir changelog değil, sadece
mimari/durum özeti; kod zaten kendini anlatıyorsa eklemeyin. Emin
değilseniz "bu not olmadan gelecekte biri aynı hatayı/aynı araştırmayı
tekrar yapar mı" sorusunu ölçüt alın.
