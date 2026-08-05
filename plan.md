# Stone Group — Media Portal (SG-B2B)

Oteller (Stone Group markaları) için resim/video/belgelerin yetkili personel
tarafından yüklendiği, müşterilerin ise giriş yapmadan tek tek veya toplu
(ZIP) indirebildiği bir B2B medya portalı. Açık/sıcak (ink/paper/brass/sand)
temalı, React Native + Web (Expo) ön yüz, ASP.NET Core + MS SQL Server arka
uç. Admin panelinde rol bazlı **dinamik yetki sistemi**, işlem kayıtları,
4 dilli arayüz (TR/EN/DE/RU) ve sürükle-bırak (klasör dahil) dosya yükleme var.

---

## 1. Çalıştırma — Hızlı Başlangıç

### Gereksinimler
- Node.js 20+
- .NET SDK 10
- MS SQL Server (yerel `SQLEXPRESS` örneği, Integrated Security ile — TCP/IP
  açmaya gerek yok, `Microsoft.Data.SqlClient` Shared Memory/Named Pipes
  üzerinden bağlanır)

### İlk kurulum (bir kez)

> **Şema iki parçadan oluşuyor, ikisi de gerekli** — `dotnet ef database
> update` yalnızca EF Core migration geçmişindeki (`B2B.API/Migrations/`)
> **5 tabloyu** oluşturur: `Users`, `RefreshTokens`, `Hotels`, `Folders`,
> `Files`. `AppDbContext`'teki `PasswordResetTokens`, `EmailSettings`,
> `AuditLogs`, `RolePermissions` DbSet'lerinin hiçbir EF migration'ı YOK —
> bu 4 tablo yalnızca `B2B.Database/Tables/` altında SQL (SSDT proje) olarak
> tanımlı ve şema kaynağı olarak orası kullanılıyor (bkz. bölüm 1.3). Sadece
> `dotnet ef database update` çalıştırıp bu adımı atlarsanız login çalışır
> ama şifremi-unuttum, e-posta ayarları, denetim kaydı, rol-izin ekranları
> tablo eksikliğinden patlar.

```bash
# Kök dizinde
npm install

# Backend paketleri zaten B2B.API/B2B.API.csproj içinde tanımlı,
# ilk çalıştırmada otomatik restore edilir.

# 1) EF Core migration'larını uygula — SADECE 5 temel tabloyu oluşturur
#    (Users, RefreshTokens, Hotels, Folders, Files)
dotnet ef database update --project B2B.API --startup-project B2B.API

# 2) Kalan 4 tablo (PasswordResetTokens, EmailSettings, AuditLogs,
#    RolePermissions) + varsayılan seed verisi için SSDT dacpac'i AYNI
#    veritabanına publish edin (bkz. bölüm 1.3). ÖNEMLİ: B2B.Database eski
#    (legacy) SSDT formatında bir proje — `dotnet build` İLE DERLENEMEZ
#    (MSB4278 hatasıyla patlar). Visual Studio'da açıp (SSDT/Data-tier
#    Application araçları kurulu olmalı, bkz. bölüm 1.1 "Ön koşullar")
#    **Build** edin — bu B2B.Database\bin\Debug\B2B.Database.dacpac
#    dosyasını üretir. Sonra ya VS'in "Publish Database" özelliğiyle
#    (Load Profile → localhost.publish.xml — dev hedefi bu) ya da
#    SqlPackage.exe ile aşağıdaki gibi uygulayın (profile zaten doğru
#    hedefi/connection string'i içerdiği için elle yazmaya gerek yok):
SqlPackage.exe /Action:Publish ^
  /SourceFile:"B2B.Database\bin\Debug\B2B.Database.dacpac" ^
  /Profile:"B2B.Database\localhost.publish.xml"

# İlk admin kullanıcıyı oluştur (appsettings.Development.json > SeedAdmin)
# — dacpac publish zaten Users boşsa admin/1 seed ediyor, bu adım isteğe
# bağlı bir alternatif (bkz. "Giriş bilgileri" altındaki not)
cd B2B.API
dotnet run -- seed
cd ..
```

> **Bağlantı dizesi artık `appsettings*.json` içinde DEĞİL** — bkz. bölüm
> "Veritabanı bağlantısı" ve bölüm 3.1 (`B2B.Configuration`). `dotnet ef`
> komutları da bu yüzden EF'in `AppDbContext` tasarım-zamanı factory'sini
> kullanır; `ConnectionStringValues.cs` dosyanızın dolu olduğundan emin olun.

### Her geliştirme oturumunda çalıştırılacak iki komut

```bash
# Terminal 1 — Backend (http://localhost:4000; frontend'in .env'i ise IIS
# üzerinden — http://dev.b2b/b2b.api — geçer, bkz. bölüm 1.1)
npm run dev:server
# eşdeğeri: dotnet run --project B2B.API

# Terminal 2 — Frontend / Expo web (http://localhost:8081)
npm run dev:app
# eşdeğeri: npm run web -w B2B-Web  ->  expo start --web
```

Mobilde test için: `cd B2B-Web && npm run android` veya `npm run ios` (ya da
`npm run dev:app` sonrası Expo Go ile QR kod okutma).

### Swagger (API dokümantasyonu + test arayüzü)

IIS'teki B2B.API uygulaması (bkz. bölüm 1.1) çalışırken: **http://dev.b2b/b2b.api/swagger**

- Sağ üstteki **Authorize** butonuna tıklayıp `/api/auth/login`'den aldığınız
  `accessToken`'ı yapıştırın (`Bearer` ön eki gerekmez, Swagger otomatik ekler).
- Yetkilendirmeden sonra kilitli (🔒) tüm uçları doğrudan "Try it out" ile
  test edebilirsiniz.

### Giriş bilgileri (yerel geliştirme)

| Alan | Değer |
|---|---|
| URL | `http://localhost:8081/login` |
| Kullanıcı adı | `admin` |
| Şifre | Bu makinedeki dev DB'de doğrulanmış: **`Pass1234`** (2026-07-11'de `admin` kullanıcısı üzerinden `PATCH /api/users/1` ile `1`'den değiştirildi; bkz. not aşağıda) |

> **İki ayrı seed yolu var, birbirini karıştırmayın:**
> 1. `dotnet run -- seed` (Program.cs) — `appsettings.Development.json`
>    içindeki `SeedAdmin:Password` neyse onu kullanır (git'e girmez, sadece
>    sizde ne yazdıysa o).
> 2. `B2B.Database/Scripts/Script.PostDeployment.sql` — SSDT projesi
>    publish edildiğinde, `Users` tablosu boşsa `admin` kullanıcısını
>    **şifre `1`** ile (sabit bcrypt hash) seed eder — bu SADECE ilk seed
>    anında geçerli, sonradan panelden değiştirilebilir (yukarıdaki gibi).
> Bu makinedeki dev veritabanı başlangıçta (2) yoluyla seed edilmişti, ama
> gerçek çalışan şifre artık yukarıdaki tabloda yazan **`Pass1234`** —
> `appsettings`'teki `SeedAdmin:Password` veya SSDT'deki `1` DEĞİL. Şifre
> tekrar sıfırlanırsa (DB yeniden seed edilirse) `1`'e döner. Farklı bir
> makinede/DB'de hangi yolun kullanıldığını ve şifrenin ne olduğunu kontrol
> edin.
>
> Gerçek/production ortamında `SeedAdmin:Password` (veya SSDT script'indeki
> hash) ve `Jwt:AccessSecret`/`RefreshSecret` değerleri mutlaka değiştirilmeli.

### Önemli parametreler / konfigürasyon dosyaları

| Dosya | Ne işe yarar |
|---|---|
| `B2B.API/appsettings.Development.json` | Dev ortamı: `Jwt:*` (access/refresh/parola-sıfırlama süresi + secret), `Storage:Root`, `CorsOrigins`, `SeedAdmin:*`. **`ConnectionStrings` ve eski `App:PublicWebUrl` artık burada YOK** — bkz. `B2B.Configuration`. |
| `B2B.API/appsettings.Production.json` | Prod ortamı için aynı anahtarlar (connection string hariç), farklı değerler. İkisi de `.gitignore`'da — repoya girmez, yalnızca `.example` şablonları girer |
| `B2B.Configuration/ConnectionStringValues.cs` | **Gerçek connection string'ler burada** (gitignored; şablonu `.cs.example`) — bkz. bölüm 3.1 |
| `B2B-Web/.env` | `EXPO_PUBLIC_API_URL=http://dev.b2b/b2b.api/api` — SADECE native build'ler (`npm run android`/`ios`) için; web'de 2026-07-15'ten beri `src/lib/api/apiUrl.web.ts` runtime'da hostname'e göre çözüyor, bu değişken web export'unda artık kullanılmıyor (bkz. bölüm 1.2) |
| `B2B.API/Properties/launchSettings.json` | Backend'in dinlediği port (`http://localhost:4000`); IIS profili `ASPNETCORE_ENVIRONMENT=Development` (yerel `http://dev.b2b/b2b.api` test sitesi kasıtlı olarak hep Development — gerçek prod SGAPPSRV'de) |

### Veritabanı bağlantısı — artık appsettings'te değil, **hostname'e göre** seçiliyor

Connection string'ler `appsettings.*.json`'dan tamamen kaldırıldı; onun
yerine `B2B.Configuration` projesindeki `ConnectionStringProvider`, **gelen
HTTP isteğinin hostname'ine** bakarak Dev/Prod seçer (bkz. 3.1):
- `localhost` → Dev (`Server=localhost\SQLEXPRESS;Database=SgB2bHotelMedia;...`)
- `dev.b2b` → Dev (aynı connection string — yerel IIS test sitesi, bkz. bölüm 1.1)
- `b2b` → Prod (`Server=SGAPPSRV\SQL2019;Database=SgB2bHotelMedia;...`)
- Başka bir host → `IHostEnvironment.IsProduction()`'a düşer

Bu sayede **aynı derlenmiş uygulama** hem bu makinedeki `http://localhost:8081`
dev sunucusuna hem yerel `http://dev.b2b/b2b.api` IIS test sitesine (farklı
hostname, aynı binary) hizmet ederken doğru veritabanına bağlanır — IIS
sitesinin `ASPNETCORE_ENVIRONMENT`'ını değiştirmeye gerek kalmaz. Aynı mantık
`PublicWebUrlProvider` ile e-posta bağlantıları (şifre sıfırlama, hoş geldin)
için de geçerli: hangi hostname'den istek geldiyse o hostname'e uygun
frontend URL'i üretilir (`localhost` → `http://localhost:8081`, `dev.b2b` →
`http://dev.b2b`, `b2b` → `http://b2b`).

> **Önemli — prod'a geçmeden önce:** App Pool identity'sinin `SGAPPSRV\SQL2019`
> üzerinde bir SQL login'i olması gerekir (aşağıdaki "IIS için derleme"
> bölümüne bakın), ve `B2B.Configuration/ConnectionStringValues.cs`'teki
> `Prod` değerinin doğru/güncel olduğundan emin olun (git'e girmez, elle
> senkronize edilir).

### Sık kullanılan diğer komutlar

```bash
npm run typecheck          # B2B-Web/ workspace TypeScript kontrolü
npm run lint               # B2B-Web/ workspace ESLint

dotnet build --project B2B.API                                                      # backend derleme
dotnet ef migrations add <İsim> --project B2B.API --startup-project B2B.API          # yeni migration
dotnet ef database update --project B2B.API --startup-project B2B.API               # migration uygula
```

> **Not:** Backend çalışırken (`dotnet run`) `dotnet build`/`dotnet ef` komutları
> `.exe` dosyasını kilitli bulup hata verir. Önce çalışan `dotnet` sürecini
> durdurun (`taskkill /PID <pid> /F` veya terminali Ctrl+C ile kapatın). IIS'te
> yayınlanmışsa önce App Pool'u durdurun (`Stop-WebAppPool`), publish edin,
> sonra başlatın (`Start-WebAppPool`).

---

## 1.1. IIS için derleme (publish)

Yerel geliştirmede kullanılan `dotnet run` (Kestrel, `:4000`) IIS'e uygun
değildir — **gerçek prod'a** (SGAPPSRV) deploy için hâlâ **Release publish**
çıktısı gerekir (aşağıya bakın). Bu makinedeki **yerel dev/test sitesi**
(`http://dev.b2b/b2b.api`, bkz. hemen altındaki alt bölüm) ise kasıtlı
olarak farklı/daha basit bir kurulum kullanıyor — publish gerektirmiyor.

### Yerel dev/test sitesi — `http://dev.b2b/b2b.api` (publish GEREKTİRMEZ)

> **2026-07-14 — path-tabanlı `localhost/b2b`'den hostname-tabanlı
> `dev.b2b`'ye geçildi.** Eskiden bu bölümde anlatılan kurulum
> `Default Web Site` altında `/b2b` + `/b2b/b2b.api` path-tabanlı iki
> Application'dı — o kurulum artık **kaldırıldı**, aşağıdaki hostname-tabanlı
> kurulum onun yerini aldı. Kardeş proje SG-Portal zaten aynı deseni
> (`dev.sg-portal`) kullanıyordu, B2B bu turda ona uydu.

IIS yapısı artık **hostname-tabanlı**: `dev.b2b` adında ayrı bir IIS site
var (port 80, host header `dev.b2b`, physical path `B2B-Web/dist` — frontend
site KÖKÜNDE serve ediliyor, `/b2b` alt-path'i yok). İçinde tek seviye nested
bir Application var: `/b2b.api` (B2B.API), physical path ham proje klasörü
(`C:\Develop\Workspaces\SG-B2B\B2B.API`, `publish/` DEĞİL). **Hem site kökü
(frontend, statik dosya) hem `/b2b.api` (B2B.API, InProcess ASP.NET Core)
AYNI TEK app pool'u kullanıyor: `dev.b2b`** (No Managed Code — 2026-07-15'te
bilinçli olarak buraya çevrildi, aşağıdaki nota bakın; ayrı bir `b2b.api
AppPool` artık YOK). İçindeki `web.config` (`.NET SDK`'nin `dotnet build`
sırasında otomatik ürettiği dosya, `hostingModel="InProcess"`)
`bin\Debug\net10.0\B2B.API.exe`'yi işaret ediyor — yani `dotnet build B2B.API`
her çalıştığında IIS'in çalıştıracağı `.exe` de güncellenmiş oluyor, publish
adımı gerekmiyor.

Hostname çözümü için `C:\Windows\System32\drivers\etc\hosts`'a
`192.168.5.80  dev.b2b` eklendi (bu makinenin kendi LAN IP'si — kardeş
`dev.sg-portal` girdisiyle aynı desen; `127.0.0.1` de çalışırdı ama
tutarlılık için aynı IP kullanıldı).

> **2026-07-11 — 503 "Application Shutting Down" ve kök nedeni**: `/b2b/b2b.api`
> başlangıçta `DefaultAppPool`'u kullanıyordu — ama bu pool'un tek worker
> process'inde (`w3wp.exe`) zaten `/sg-portal/sg-portal.api` **InProcess**
> olarak çalışıyordu. IIS, **aynı app pool içinde birden fazla InProcess
> ASP.NET Core uygulamasına izin vermiyor** (daha önce farklı bir kurulumda
> "HTTP Error 500.35" olarak yaşanan, kavramsal olarak aynı tuzak — burada
> ANCM isteği hiç yönlendiremediği için sürekli 503 dönüyordu, event log'da
> B2B.API'ye ait tek bir kayıt bile yoktu). **Düzeltme**: B2B.API için ayrı,
> özel bir App Pool oluşturuldu — `b2b.api AppPool` (No Managed Code,
> `ApplicationPoolIdentity`) — ve `/b2b/b2b.api` bu pool'a taşındı. **(ARTIK
> GEÇERSİZ, tarihsel — 2026-07-15'te bu ayrı pool tamamen kaldırıldı, bkz.
> aşağıdaki 2026-07-15 notu; `/b2b.api` artık `dev.b2b` pool'unu kullanıyor.)**
> O dönem bu pool adı bilinçli olarak eskiden var olan isimle aynı seçilmişti
> (SQL Server login + `storage/` ACL'i deterministik SID sayesinde otomatik
> geri kazanmak için) — aynı mantık şimdi `dev.b2b` pool identity'si için
> geçerli, hemen aşağıdaki nota bakın.

> **Bilinen tuzak**: InProcess hosting modelinde ASP.NET Core uygulaması
> IIS worker process'inin (`w3wp.exe`) içinde çalışır; worker process yakın
> zamanda bir istek almışsa (yani zaten ayaktaysa), `bin\Debug\net10.0\B2B.API.dll`
> (ve ilgili dosyalar) kilitli olabilir ve `dotnet build` "dosya kullanımda"
> hatası verebilir — bu, `dotnet run` için zaten belgelenen kilitlenme
> sorunuyla aynı sınıf (bkz. "Sık kullanılan diğer komutlar" altındaki not).
> Bu durumda önce `Stop-WebAppPool -Name "dev.b2b"`, build'den sonra
> `Start-WebAppPool -Name "dev.b2b"` gerekir (worker process'i yeniden
> başlatmak da InProcess modelde genelde yeterli: `Restart-WebAppPool -Name
> "dev.b2b"` — DİKKAT: bu pool artık hem frontend hem API'yi taşıdığı için
> bu komut frontend'i de kısa süreliğine kesintiye uğratır, 2026-07-15
> öncesi sadece API etkilenirdi).
>
> **2026-07-29 — bu makinedeki Claude Code kabuğu IIS'i yönetemiyor**:
> `Import-Module WebAdministration` / `Stop-WebAppPool` bu ortamdaki
> (yükseltilmemiş) PowerShell oturumunda "Process should have elevated
> status to access IIS configuration data" ile başarısız oluyor — yani bir
> ajan oturumu `dev.b2b` pool'unu kendi başına durduramaz/başlatamaz, kilitli
> `bin\` klasörüne asla build alamaz. **Derlemeyi doğrulamak için** (pool'a
> hiç dokunmadan) `dotnet build B2B.API -o <başka bir klasör>` kullanın —
> `-o` çıktıyı `bin\`'in dışına yönlendirir, kilit sorunu hiç oluşmaz; bu
> sadece derleme doğrulaması sağlar, IIS'teki çalışan uygulamayı GÜNCELLEMEZ
> (canlı testin gerçek `dev.b2b/b2b.api`'ye yansıması için pool'u
> durdurma/build/başlatma döngüsünü hâlâ kullanıcının kendisi yapması
> gerekir).
>
> **2026-07-12 — (ARTIK GEÇERSİZ, tarihsel) `/b2b` path-tabanlı frontend
> export'u**: O tarihte `/b2b` Application'ı `EXPO_PUBLIC_BASE_PATH=/b2b`
> override'ıyla export edilen `dist/`'i serve ediyordu. **2026-07-14'te bu
> path-tabanlı kurulum tamamen kaldırıldı** (bkz. bu bölümün başı) —
> `dev.b2b` artık site KÖKÜNDE serve ediyor, `EXPO_PUBLIC_BASE_PATH`
> override'ına gerek YOK (bkz. bölüm 1.2, "Ortam değişkenleri" altındaki
> güncel not).
>
> **2026-07-14 — `dev.b2b` hostname-tabanlı kuruluma geçiş**: `dev.b2b`
> IIS site'ı ve `/b2b.api` Application'ı bu konuşma öncesinde elle
> oluşturulmuş bulundu, ama `/b2b.api` yanlışlıkla `dev.b2b` app pool'una
> (managed runtime `v4.0` — ASP.NET Core InProcess için geçersiz) bağlıydı
> ve eski `b2b.api AppPool` (doğru yapılandırılmış, SQL/storage izinleri
> hazır) `Default Web Site/b2b/b2b.api` altında kullanılmadan duruyordu.
> Düzeltme: eski `Default Web Site/b2b/b2b.api` Application'ı silindi,
> `dev.b2b` site'ındaki `/b2b.api`'nin app pool'u `b2b.api AppPool`'a
> çevrildi ve başlatıldı. `http://dev.b2b/b2b.api/api/hotels` ile
> doğrulandı (200, gerçek Dev DB verisi). Ayrıca `dist/`'in o anki hali
> `.env.production` (`http://b2b/b2b.api/api`) ile export edilmiş bulundu —
> ve `"b2b"` hostname'i bu makinede gerçekten çözülüyor (`b2b.stn.local` →
> `192.168.16.4`, SGAPPSRV) — yani `http://dev.b2b` açan biri farkında
> olmadan **canlı prod API/DB'sine** istek atıyordu (yükleme/silme dahil,
> sadece okuma değil). Aynı gün kullanıcı bunu fark edip bildirdi;
> `dist/` bölüm 1.2'deki güncel komutla (`EXPO_PUBLIC_API_URL=http://dev.b2b/b2b.api/api`)
> yeniden export edildi ve doğrulandı (`_expo/static/js` içindeki bundle'da
> artık `http://dev.b2b/b2b.api/api` var, `http://b2b` yok).

> **2026-07-14 — gerçek prod'da DELETE isteklerinde 405 (WebDAV tuzağı)**:
> Kullanıcı admin panelinden dosya silerken `http://b2b/b2b.api/api/files/{id}`
> üzerinde 405 aldığını bildirdi. Teşhis: gerçek prod'a (`http://b2b`)
> `OPTIONS`/`POST` istekleri sorunsuz uygulamaya ulaşıp doğru cevap
> veriyordu (`OPTIONS` → `Allow: DELETE`, `POST /files/bulk-delete` → `401`),
> ama çıplak `DELETE` isteği **uygulamaya hiç ulaşmadan** IIS seviyesinde
> `405 (Allow: GET, HEAD, OPTIONS, TRACE)` ile kesiliyordu — bu Allow listesi
> uygulamanın kendisinden asla gelemez (bkz. yukarıki `OPTIONS` sonucu),
> yani IIS'in **WebDAV Publishing modülü** DELETE/PUT gibi "authoring"
> fiillerini ASP.NET Core Module'e ulaştırmadan kendi yakalıyordu. Yerelde
> WebDAV kurulu olmadığı için bu hiç görülmemişti (DELETE sorunsuz
> uygulamaya ulaşıp `401` dönüyordu). **Düzeltme**: `B2B.API/web.config`
> (repoya kayıtlı, `dotnet build`/`publish` her seferinde SADECE
> `<aspNetCore>` bölümünü güncelleyip diğer bölümleri koruyor — bu davranış
> Release publish çıktısıyla karşılaştırılarak doğrulandı) içine
> `<modules><remove name="WebDAVModule" /></modules>` +
> `<handlers><remove name="WebDAV" /></handlers>` eklendi. WebDAV kurulu
> olmayan ortamlarda (yerel dev dahil) bu kaldırma zararsız/no-op — orada
> zaten hiçbir şeyi bozmadığı doğrulandı. **Kural**: Bu proje SGAPPSRV'e
> hiçbir zaman bu makineden uzaktan yönetilmiyor (yalnızca HTTP client
> olarak istek atılabiliyor) — bu yüzden düzeltme IIS Manager'da elle değil,
> repoya kayıtlı `web.config` üzerinden yapıldı; kullanıcı bir sonraki
> `dotnet publish B2B.API -c Release` + SGAPPSRV'e deploy adımında bu
> düzeltmeyi otomatik alacak.

> **2026-07-20 — büyük resim toplu yüklemelerinde sessiz IIS reddi (aynı
> "IIS önce yakalıyor" tuzak sınıfı, request-filtering bu kez)**: Kullanıcı
> birden fazla gerçek kamera/telefon fotoğrafını (tipik 5–15 MB) aynı
> klasöre sürükleyip bıraktığında çoğu "başarısız" dönüyordu, sebep hiç
> gösterilmiyordu. Kök neden: `Program.cs` Kestrel'in kendi body-size
> limitini 2.1 GB'a çekmiş ve controller `[RequestSizeLimit(2_100_000_000)]`
> taşısa da, IIS'in **request-filtering modülü** bunlardan tamamen bağımsız
> ve ÖNCE devreye giren kendi varsayılan ~28.6 MB (`maxAllowedContentLength`
> varsayılanı 30.000.000 byte) sınırını uyguluyordu — InProcess hosting'te
> bile. Birkaç gerçek boyutlu JPEG tek bir multipart isteğe (frontend aynı
> hedef klasöre bırakılan dosyaları gruplayıp tek POST atıyordu) toplandığında
> bu sınır aşılıyor, IIS isteğin tamamını uygulamaya hiç ulaştırmadan ham
> (JSON olmayan) 404.13 ile reddediyordu. **Düzeltme**: `B2B.API/web.config`
> içine `<system.webServer>` altında `<security><requestFiltering>
> <requestLimits maxAllowedContentLength="2100000000" /></requestFiltering>
> </security>` eklendi — Kestrel/`[RequestSizeLimit]` ile aynı değere
> çekildi. **Aynı turda ikinci bağımsız bug**: `FileService.SaveUploadedFilesAsync`
> tek istekteki TÜM dosyalar için hepsi-ya-da-hiçbiri çalışıyordu — ilk
> geçersiz dosyada (MIME whitelist/magic-byte uyuşmazlığı) `throw` tüm
> isteği iptal ediyor, ama o ana kadar diske zaten yazılmış dosyalar
> (`CopyToAsync` döngü içinde, `SaveChangesAsync` ise döngü sonunda TEK
> seferde) DB satırı olmadan diskte öksüz kalıyordu. Frontend'in aynı
> hedef klasöre bırakılan dosyaları tek POST'ta gruplaması (bkz.
> `dragDropUpload.ts`) bunu her zaman tetikliyordu. Fable tasarım
> incelemesi, "gerçek kısmi başarı" (multi-status response) yerine —
> bu API'de hiç örneği olmayan bir şekil olduğu için — **frontend'in dosya
> başına ayrı POST atmasını** önerdi (bkz. `dragDropUpload.ts`); bu hem
> öksüz-disk-dosyası sorununu ortadan kaldırıyor (aynı istekte başka yazılan
> bir şey yok) hem `SaveUploadedFilesAsync`'in "ilk kötü dosyada throw"
> davranışını yapısal değişiklik gerektirmeden "bu tek dosya başarısız oldu"
> anlamına getiriyor. **Hata sözleşmesi de genişledi**: `ApiException`'a
> opsiyonel `Code` alanı eklendi (`BadRequest(message, code)` — diğer
> factory'ler değişmedi, ~37 çağrı yerini etkilemeyen katkısal bir değişiklik),
> `ExceptionHandlingMiddleware` artık `{ error, code }` dönüyor
> (`code: null` = özel eşleme yok, frontend genel hata mesajı gösterir).
> `FileService` iki makine-okunur kod üretiyor: `"unsupported_mime_type"`,
> `"content_mismatch"` — tanımlı ama başlangıçta `UploadLimits.MaxImageBytes`
> (25 MB) / `MaxVideoBytes` (2 GB) ile kontrol edilen `"file_too_large"`
> kaldırıldı (2026-07-20'den sonra) — boyut sınırı istenmiyor, Kestrel/IIS
> limitleri (2.1 GB) yeterli.
> **Kural**: Ham backend hata metni asla doğrudan kullanıcıya gösterilmez
> (login.tsx'teki mevcut desenle aynı) — bilinen kodlar frontend'de i18n
> anahtarına eşlenir, tanınmayan her şey (ağ hatası, IIS seviyesi HTML reddi
> dahil) jenerik bir çeviriye düşer.

> **2026-07-15 — ayrı `b2b.api AppPool` kaldırıldı, tek pool'a (`dev.b2b`)
> konsolide edildi.** Bu değişiklik oturumun başında `b2b.api AppPool`'un
> (nedeni belirsiz — muhtemelen bu makinede ayrıca yapılan bir işlem)
> tamamen silinmiş, `/b2b.api`'nin yanlış pool'a (`dev.b2b`, o an hâlâ
> managed code) düşmüş ve `Default Web Site`'ın durdurulmuş bulunmasıyla
> tetiklendi (`GET /api/hotels` 500 veriyordu). Kullanıcı bunu düzeltirken
> AYRICA "b2b.api için ayrı pool oluşturma, mevcut pool içinde çalışsın"
> talimatı verdi — yani önceki (2026-07-11'den beri süregelen) "ayrı,
> özel `b2b.api AppPool`" deseni **kasıtlı olarak terk edildi**. Yapılanlar:
> 1) `dev.b2b` pool'u No Managed Code'a çevrildi (statik dosya servisi için
> managed code hiç gerekmiyor, InProcess ASP.NET Core için de gerekmiyor —
> ikisi de aynı pool'da sorunsuz çalışıyor, doğrulandı); 2) `/b2b.api`
> Application'ı bu pool'a taşındı; 3) `b2b.api AppPool`'un sahip olduğu SQL
> Server login + rol üyelikleri + `storage/` klasör ACL'i, birebir aynı
> şekilde `IIS APPPOOL\dev.b2b` identity'sine de verildi (`sqlcmd`/`icacls`
> ile, bkz. aşağıdaki komutlar); 4) artık kullanılmayan `b2b.api AppPool`
> silindi. **Önceki notlardaki "`b2b.api AppPool`'u silip yeniden oluşturursan
> SQL/storage izinleri deterministik SID'le geri gelir" deseni ARTIK
> `dev.b2b` pool'u için geçerli** — eğer `dev.b2b` pool'u bir daha silinirse,
> aynı isimle yeniden oluşturup aşağıdaki izinleri tekrar vermek gerekir:
> ```sql
> CREATE LOGIN [IIS APPPOOL\dev.b2b] FROM WINDOWS;
> USE SgB2bHotelMedia;
> CREATE USER [IIS APPPOOL\dev.b2b] FOR LOGIN [IIS APPPOOL\dev.b2b];
> ALTER ROLE db_datareader ADD MEMBER [IIS APPPOOL\dev.b2b];
> ALTER ROLE db_datawriter ADD MEMBER [IIS APPPOOL\dev.b2b];
> ```
> ```powershell
> icacls "B2B.API\storage" /grant "IIS APPPOOL\dev.b2b:(OI)(CI)M" /T
> ```
> `Default Web Site`'ın durdurulmuş olması ayrıca kontrol edildi — boş/
> placeholder olduğu ve `dev.b2b`/`dev.sg-portal`'ın kendi host-header
> binding'leri olduğu için (`*:80:dev.b2b`, `*:80:dev.sg-portal`) bu site
> durdurulmuş olsa da diğer ikisini etkilemiyor, dokunulmadı.

### Gerçek prod'a (SGAPPSRV) deploy — Release publish

### Ön koşullar (bu makinede zaten kurulu ✅)
- IIS (`W3SVC` servisi çalışıyor olmalı)
- **ASP.NET Core Hosting Bundle** (`AspNetCoreModuleV2`)
- **URL Rewrite Module** (frontend SPA yönlendirmesi için, bkz. 1.2)

### Derleme komutu

```bash
dotnet publish B2B.API -c Release
```

Çıktı: **`B2B.API/bin/Release/net10.0/publish/`** — bu klasörün tamamı IIS'in
physical path olarak göstereceği içeriktir (`.gitignore`'da, her deploy'da
yeniden üretilir).

### IIS tarafında yapılması gerekenler (bir kez)
1. **Application Pool**: `.NET CLR Version = "No Managed Code"`, identity
   `ApplicationPoolIdentity`.
2. Physical Path → `publish/` klasörü (gerçek üretim SGAPPSRV'de,
   `ASPNETCORE_ENVIRONMENT` orada ayrıca yönetilir).
3. App Pool kimliğine `storage/` klasöründe okuma/yazma izni.
4. App Pool identity'nin hedef SQL Server'da login'i + `SgB2bHotelMedia`
   üzerinde `db_datareader`/`db_datawriter` rolü olmalı.

> Ayrıntılı IIS 403/404/login-failed teşhis geçmişi (Physical Path yanlışlığı,
> App Pool identity, SPA rewrite çakışması, göreli `storage` yolu, Swagger
> mutlak-yol sorunu) için git geçmişindeki önceki plan.md revizyonlarına
> bakılabilir — kök nedenler kalıcı olarak çözüldü, tekrar yaşanmamalı.
> (2026-07-11'deki 403.18 SG-Portal çakışması ayrı ve yeni bir kök nedendi,
> yukarıda ele alındı.)

---

## 1.2. Frontend için derleme (export)

```bash
cd B2B-Web
npm run web:export   # expo export --platform web --clear
```

Çıktı: **`B2B-Web/dist/`** — Expo Router'ın *static rendering* özelliğiyle her
rota için ayrı bir `.html` üretilir. `--clear` şart: Metro bundler cache'i
`.env.production` değişse bile eski API adresini bundle'a gömebiliyor.

### `B2B-Web/public/web.config` — otomatik kopyalanır, SPA routing'i çözer

Expo Router'ın uzantısız rotalarını (`/login`, `/hotel/5`) IIS'in servis
edebilmesi için üç URL Rewrite kuralı var:
1. `^b2b\.api/.*` → **muaf tut** (`action type="None"`) — bu kural olmadan,
   aşağıdaki SPA fallback kuralı `/b2b.api/api/hotels` gibi backend
   isteklerini de yutup frontend'in boş `index.html`'ini döndürüyordu
   (canlı olarak bir test IIS sitesiyle doğrulanmış bir regresyon).
2. Dosya varsa (`login.html`) uzantısız istekte ona yeniden yaz.
3. Yoksa (`/hotel/5` gibi dinamik rotalar) `index.html`'e düş, Expo Router'ın
   client-side router'ı devralır.

> **2026-07-12 — SPA fallback bug'ı (mutlak yol)**: 3. kuraldaki hedef
> `action type="Rewrite" url="/index.html"` (başında `/` ile) IIS'te
> **site kökünden** çözülüyor, uygulamanın KENDİ kökünden değil. Bu site
> kökünde tek bir IIS Application varken (eski port-8080 kurulumu) sorun
> değildi, ama frontend artık `Default Web Site` altında bir ALT-uygulama
> olarak (`/b2b`) serve edildiği için (bkz. bölüm 1.1) `/hotel/5` gibi
> dinamik rotalar `C:\inetpub\wwwroot\index.html`'e (boş placeholder) düşüp
> 404 veriyordu. **Düzeltme**: hedef göreli hale getirildi — `url="index.html"`
> (başında `/` YOK) — 2. kuraldaki `{R:1}.html` deseniyle aynı mantık.
> **Kural**: bu web.config'e yeni bir rewrite eklerken hedef URL'i HER ZAMAN
> göreli yazın, mutlak (`/`) yazmayın — nested application senaryosunda kırılır.

### Ortam değişkenleri (API adresi + base path)

> **2026-07-15 — API adresi artık build-time'da DEĞİL, web'de RUNTIME'da
> çözülüyor (aşağıdaki eski anlatı sadece native platform için geçerli,
> web kısmı ARTIK GEÇERSİZ/tarihsel).** Bu oturumda build-time sabitleme
> tekrar tekrar soruna yol açtı: yanlış `.env` ile export alınan `dist/`
> yanlış siteye deploy edildi, `dev.b2b` sitesi bir ara gerçek prod'a
> (`http://b2b`) istek atan bir bundle'la test edildi (canlı veriye
> yanlışlıkla dokunma riski), Metro cache bayatlaması yüzünden `.env`
> değişikliği bazen yansımadı. Backend zaten bu sorunu hostname'e göre
> runtime seçimle çözmüştü (`B2B.Configuration/ConnectionStringProvider.cs`,
> `PublicWebUrlProvider.cs`, bkz. bölüm 3.1) — aynı desen frontend'e de
> taşındı (fable ile karar verilip uygulandı): `src/lib/api/apiUrl.web.ts`
> (`resolveApiUrl()`) sayfa `window.location.hostname`'ine bakıp
> `"localhost" → http://dev.b2b/b2b.api/api`, `"dev.b2b" → http://dev.b2b/b2b.api/api`,
> `"b2b" → http://b2b/b2b.api/api` eşlemesini yapıyor; tanınmayan bir
> hostname'de önce `EXPO_PUBLIC_API_URL`'e (varsa), yoksa aynı-origin
> `/b2b.api/api`'ye düşüyor. `src/lib/api/client.ts` artık `API_URL`'i
> buradan alıyor — `downloadFile.web/native.ts`, `FileThumbnail.tsx`,
> `hotels/hooks.ts` zaten `client.ts`'ten import ettiği için değişmeye
> gerek kalmadı. **Expo Router'ın static rendering'i** (`expo export`
> sırasında her route Node.js'te pre-render edilir, orada `window`
> TANIMSIZ) `typeof window === "undefined"` guard'ıyla ele alındı —
> prerender'da gerçek bir isteğe hiç ulaşmayan bir fallback'e düşüyor (tüm
> API çağrıları zaten client-side, hydration sonrası). **Sonuç: artık
> `npm run web:export` HİÇBİR env override'ı OLMADAN tek şekilde alınıyor,
> aynı `dist/` klasörü hem `dev.b2b` hem gerçek `b2b`'de doğru API'ye
> bağlanıyor**:
> ```powershell
> cd B2B-Web
> npm run web:export
> ```
> `native` platformda (iOS/Android) davranış BİLİNÇLİ OLARAK değişmedi —
> `apiUrl.native.ts` hâlâ aşağıda anlatılan build-time `EXPO_PUBLIC_API_URL`
> davranışını kullanıyor (native binary IIS'e deploy edilmiyor, tek build
> tek API'ye bağlı kalıyor zaten).

`B2B-Web/.env` (dev, `http://dev.b2b/b2b.api/api`) ve
`B2B-Web/.env.production` (`http://b2b/b2b.api/api`) — SADECE native
build'lerde (`npm run android`/`ios`) derleme anında JS bundle'ına gömülür;
web export akışı için artık yukarıdaki hostname eşlemesi geçerli.

> **2026-07-14 (tarihsel, base path mekanizması hâlâ geçerli) —
> `EXPO_PUBLIC_BASE_PATH` gerekmiyor.** Eskiden (2026-07-12, tarihsel) yerel
> test sitesi `Default Web Site` altında bir ALT-uygulama
> (`http://localhost/b2b/`) olduğu için Expo'nun kök-mutlak asset
> path'lerini (`/_expo/static/*`) `/b2b` prefix'iyle üretmek gerekiyordu
> (`EXPO_PUBLIC_BASE_PATH=/b2b`, `app.config.js` üzerinden — bu mekanizma
> hâlâ kodda duruyor, ama kullanılmıyor). Artık `dev.b2b` kendi
> hostname'inde SİTE KÖKÜNDE serve ediyor (gerçek prod `http://b2b/` ile
> aynı şekil), yukarıdaki standart `npm run web:export` (override'sız)
> yeterli. `dev.b2b` IIS site'ının physical path'i zaten `B2B-Web/dist`
> (bkz. bölüm 1.1).

---

## 1.3. Prod veritabanı şeması — `B2B.Database` (SQL Server Database Project)

`dotnet ef database update` yerine, prod şeması bir **SQL Server Database
Project** (`B2B.Database/`) olarak tutuluyor — ama **eski (legacy) SSDT
formatında** (`<DSP>Microsoft.Data.Tools.Schema.Sql.Sql150DatabaseSchemaProvider</DSP>`,
`TargetFrameworkVersion v4.7.2`), modern `Microsoft.Build.Sql` SDK-style bir
proje DEĞİL. Bu yüzden **sadece Visual Studio (veya MSBuild.exe + SSDT build
araçları) ile derlenebiliyor, `dotnet build`/`dotnet` CLI'siyle DEĞİL**
(denenmiş, `MSB4278` hatasıyla patlıyor). Derlendikten sonra Visual
Studio'nun "Publish Database" özelliğiyle (Load Profile →
`localhost.publish.xml` dev için, `B2B.publish.xml` prod için — hedef
`SGAPPSRV\SQL2019`) veya `SqlPackage.exe` CLI ile (`/Profile:...` parametresiyle,
elle connection string yazmaya gerek yok) uygulanır.

> **Bu sadece prod için değil — projenin TAM şema kaynağı bu.** EF Core
> migration'ları (`B2B.API/Migrations/`) yalnızca 5 tabloyu (bölüm 1'deki
> "İlk kurulum"a bakın) kapsıyor; `PasswordResetTokens`, `EmailSettings`,
> `AuditLogs`, `RolePermissions` SADECE burada tanımlı. Yani dev ortamı
> kurulumunda da bu dacpac'in (`localhost.publish.xml` profiliyle) publish
> edilmesi gerekir — sadece prod'a özgü isteğe bağlı bir adım değil.

```
B2B.Database/
├── B2B.Database.sqlproj
├── Tables/*.sql              Users, RefreshTokens, Hotels, Folders, Files,
│                              PasswordResetTokens, EmailSettings, AuditLogs,
│                              RolePermissions
└── Scripts/Script.PostDeployment.sql
                               Users boşsa admin/1 seed eder (bcrypt hash);
                               EmailSettings boşsa placeholder bir satır ekler;
                               RolePermissions boşsa Yönetici/Kullanıcı için
                               varsayılan izinleri ekler (bkz. bölüm 3.2)
```

> **Yeni bir EF migration eklediğinizde bu SQL dosyalarını da elle
> güncellemeniz gerekir** — iki taraf birbirinden otomatik türetilmiyor. Aynı
> şekilde `Permissions.cs`'e yeni bir izin eklerseniz, post-deployment
> script'teki varsayılan `RolePermissions` satırlarını da güncelleyin.

```bash
# B2B.Database Visual Studio'da Build edilmeli (dotnet build ÇALIŞMAZ,
# yukarıya bakın) → bin/Debug/B2B.Database.dacpac üretir. Prod'a publish:
SqlPackage.exe /Action:Publish ^
  /SourceFile:"B2B.Database\bin\Debug\B2B.Database.dacpac" ^
  /Profile:"B2B.Database\B2B.publish.xml"
```

---

## 2. Genel Mimari

```
SG-B2B/
├── B2B-Web/                 Expo Router — React Native + Web (müşteri + admin arayüzü)
├── B2B.API/                 ASP.NET Core 10 Web API (.NET), EF Core + MS SQL Server
├── B2B.Configuration/       Ortama göre connection string + public URL seçen küçük class library
├── B2B.Database/            SQL Server Database Project (prod şema publish için, bkz. 1.3)
├── B2B.API.slnx             Visual Studio çözüm dosyası (üç proje de içinde)
├── plan.md                  Bu dosya — proje haritası, her büyük değişiklikte güncellenir
└── README.md                Kısa kurulum özeti
```

Backend ve frontend tamamen ayrı süreçler olarak çalışır, aralarındaki tek
bağlantı REST API'dir. Web'de API adresi artık build-time env değişkeni
değil, **runtime'da sayfanın hostname'ine göre** çözülüyor (bkz. bölüm 1.2
"Ortam değişkenleri" ve bölüm 4 "Veri katmanı") — `EXPO_PUBLIC_API_URL`
sadece native build'lerde ve tanınmayan hostname'lerde devrede.

---

## 3. Backend — `B2B.API` (ASP.NET Core 10, namespace `B2B.API`)

### Katmanlar
```
B2B.API/
├── Program.cs                  DI, JWT auth, CORS, Kestrel body-size limiti, `-- seed` komutu
├── Models/                     User, UserRole(Admin|Manager|Staff), RefreshToken, Hotel, Folder,
│                              MediaFile, FileKind, PasswordResetToken, EmailSettings, AuditLog,
│                              RolePermission, Permissions (sabit izin anahtarları)
├── Data/AppDbContext.cs        EF Core DbContext + Fluent API
├── Dtos/                       Request/response record'ları (Auth, Hotel, Folder, File, User,
│                              EmailSettings, AuditLog, RolePermission)
├── Services/                   İş mantığı (bkz. tablo)
├── Controllers/                Auth, Hotels, Folders, Files, Users, Download, EmailSettings,
│                              AuditLogs, RolePermissions
├── Middleware/                 ApiException + global hata yakalama (JSON error response)
└── Migrations/                 EF Core migration geçmişi
```

### Servisler
| Servis | Sorumluluk |
|---|---|
| `AuthService` / `TokenService` | Login, JWT access + refresh token, şifremi-unuttum/sıfırlama (token `PasswordResetToken` tablosunda, TTL `Jwt:PasswordResetTtlMinutes`), yeni kullanıcı için "hoş geldin + şifre belirle" e-postası |
| `UserService` | Kullanıcı CRUD, BCrypt hash. Yönetici/Kullanıcı Sistem Yöneticisi hesaplarını göremez/düzenleyemez/atayamaz (bu koruma **yapılandırılamaz**, kod içinde sabit) |
| `HotelService` | Otel CRUD, slug üretimi, logo yükleme |
| `FolderService` | İç içe klasör CRUD, **materialized path** (`Folder.Path`, örn. `/1/4/9/`). `MoveAsync` (taşıma) kendi altına/soyuna taşımayı `parent.Path.StartsWith(folder.Path)` ile reddeder, taşınan klasör + tüm alt ağacının `Path`'ini tek `SaveChangesAsync` içinde yeniden yazar — kodda `Path`'i toplu güncelleyen tek yer burası (`DeleteAsync` sadece okur, hiç yazmaz). **Öncelik sırası** (2026-07-29): `Folder.SortOrder` artık gerçekten kullanılıyor — `CreateAsync` yeni klasörü kardeş sayısına göre sona ekler, `MoveAsync` taşınan klasörü hedef kapsamın sonuna (eski `SortOrder`'ı değil, hedefteki kardeş sayısını) atar, yeni `ReorderAsync(hotelId, parentFolderId, orderedIds)` bir kapsamdaki TÜM kardeşleri `orderedIds` sırasına göre 0..n-1'e sıkı şekilde yeniden yazar (kısmi/tekil güncelleme yok, id kümesi birebir eşleşmezse 400) |
| `FileService` | Dosya yükleme, MIME whitelist + magic-byte doğrulama (`FileTypeSniffer`). `SaveUploadedFilesAsync` istek başına hepsi-ya-da-hiçbiri (ilk geçersiz dosyada throw) — 2026-07-20'den beri sorun değil çünkü frontend dosya başına ayrı POST atıyor (bkz. bölüm 1.1'deki 2026-07-20 notu); hata kodları (`unsupported_mime_type`/`content_mismatch`) `ApiException.Code` üzerinden taşınır. Boyut sınırı yoktur — Kestrel/IIS limitleri (2.1 GB) devrede. **Resim yüklemede thumbnail oluşturma** (2026-07-20): `Kind == Image` ise, ImageSharp (SixLabors 3.1.11) ile 400px genişlik, orijinal aspect ratio koruyan, JPEG %85 kalitesiyle bir thumbnail oluşturulur → `storage/hotels/{hotelId}/thumbs/{uuid}-thumb.jpg` — bu mekanizma tarayıcı/cihazlarda ilk sayfa açma performansını iyileştirir (küçük thumbnail browse sırasında, tam boyut tıklandığında). `RenameAsync`/`MoveAsync`: sadece DB kolonu (`OriginalName`/`FolderId`) değişir, `StoredFileName`/fiziksel dosya hiç dokunulmaz (storage otel-bazlı düz, klasör hiyerarşisi sadece DB'de). **Öncelik sırası** (2026-07-29): yeni `MediaFile.SortOrder` kolonu — `SaveUploadedFilesAsync` bir istekteki dosyaları hedef klasörün mevcut kardeş sayısından başlayarak ardışık atar (sona ekleme, aralarındaki sıra korunur), `MoveAsync`/`MoveManyAsync` taşınan dosya(ları) hedef klasörün sonuna ekler (eski `SortOrder` yeni kardeşler arasında rastgele bir yere düşmesin diye), yeni `ReorderAsync(hotelId, folderId, orderedIds)` `FolderService.ReorderAsync` ile birebir aynı desen. `FolderService.BrowseHotelAsync`'teki dosya sıralaması `CreatedAt` azalandan `OrderBy(SortOrder).ThenByDescending(CreatedAt)`'e değişti (eski dosyalar hep `SortOrder=0` ile başladığı için `CreatedAt` tie-break'i eski davranışı korur) |
| `ZipService` | Toplu indirme planı: `{fileIds}` VEYA `{folderId, includeSubfolders}` — **`folderId=null` ile "tüm otel recursive" desteklenmiyor**, kök seviye indirme her zaman `fileIds` listesiyle yapılmalı (frontend bunu bu şekilde çağırıyor) |
| `StorageService` | `storage/hotels/<hotelId>/<uuid>.<ext>` düz saklama |
| `EmailSender` / `EmailSettingsService` | SMTP ayarları **DB'de** (`EmailSettings` tablosu, admin panelinden düzenlenir — appsettings'te değil); e-posta gönderimi bu ayarları okur |
| `AuditLogService` / `AuditLogActionFilter` | Global MVC filter — `Kullanıcı`/`Yönetici` rolünün her mutating (POST/PUT/PATCH/DELETE) isteğini loglar; **Sistem Yöneticisi'nin kendi işlemleri bilinçli olarak loglanmıyor** |
| `PermissionService` / `RequirePermissionAttribute` | Dinamik rol-izin sistemi (bkz. 3.2) |
| `LocaleSuggestionService` | `GET /api/locale/suggest`'in arkasındaki mantık — `Connection.RemoteIpAddress` (aynı kaynak, `AuditLogActionFilter` ile birebir; `X-Forwarded-For` hiç güvenilmiyor) private/loopback ise doğrudan `null`, public ise `ip-api.com` üzerinden ücretsiz/anahtarsız bir GeoIP sorgusuyla ülke koduna bakıp TR/DE-AT-CH/RU'yu tr/de/ru'ya eşliyor, geri kalan her şey `null`. **Bu projenin ilk giden (outbound) üçüncü taraf HTTP bağımlılığı** — `Program.cs`'e ilk kez `AddHttpClient()` eklendi. Kasıtlı olarak yumuşak/kritik-olmayan bağımlılık: 2 saniyelik timeout, her hata modu (timeout/5xx/parse hatası) sessizce `null`'a düşer, asla `ExceptionHandlingMiddleware`'e patlamaz — SGAPPSRV'nin giden internet erişimi bir gün kısıtlanırsa bu uç nokta hatasız şekilde "öneri yok" davranışına döner |
| `ChangeHistoryService` | Rol-bağımsız rename/move geçmişi + undo (bkz. bölüm 5.2 — **Çöp Kutusu**). `AuditLog`'dan ayrı: `AuditLog` Sistem Yöneticisi'nin işlemlerini kasıtlı atlar, bu tablo atlamaz (undo herkesin işlemi için çalışmalı). `UndoAsync` `EntityChangeLog.PreviousValueJson`'ı deserialize edip aynı `FolderService.RenameAsync/MoveAsync`/`FileService.RenameAsync/MoveAsync`'i tekrar çağırarak geri alır — bu da kendi geri-alma işlemini normal şekilde yeniden loglar (bilinçli, "undo'nun undo'su" mümkün) |

### Veri modeli (özet)
```
User              Id, Username, Email(nullable, unique index), PasswordHash, DisplayName,
                  Role(Admin=Sistem Yöneticisi|Manager=Yönetici|Staff=Kullanıcı), IsActive
RefreshToken      Id, UserId, TokenHash, ExpiresAt, RevokedAt
PasswordResetToken Id, UserId, TokenHash, ExpiresAt, UsedAt
Hotel             Id, Name, Slug, Description, IsPublished, SortOrder, LogoFileId
Folder            Id, HotelId, ParentFolderId, Name, Path(materialized), SortOrder,
                  IsDeleted, DeletedAt(nullable), DeletedById(nullable) — bkz. 5.2
MediaFile         Id, HotelId, FolderId, SortOrder, Kind(Image|Video|Logo|Document), OriginalName,
                  StoredFileName, MimeType, SizeBytes, UploadedById, ThumbnailFileName(nullable),
                  IsDeleted, DeletedAt(nullable), DeletedById(nullable) — bkz. 5.2
EmailSettings     Id(tek satır), SmtpHost, SmtpPort, SmtpUsername, SmtpPassword, FromAddress,
                  FromName, EnableSsl
AuditLog          Id, UserId, Action, EntityType, EntityId, Details, StatusCode, CreatedAt
RolePermission    Id, Role(Manager|Staff — Admin hiç satır almaz), PermissionKey
EntityChangeLog   Id, HotelId, EntityType(Folder|File), EntityId(FK yok — satır sonradan
                  purge edilebilir), ChangeType(Rename|Move), PreviousValueJson, ChangedById,
                  ChangedAt — bkz. 5.2
```

### 3.2. Dinamik rol/izin sistemi ("Rol Yetkileri")

Üç rol: **Sistem Yöneticisi** (Admin — her zaman her şeye yetkili, sabit,
yapılandırılamaz) / **Yönetici** (Manager) / **Kullanıcı** (Staff). Yönetici
ve Kullanıcı'nın *hangi işi* yapabileceği artık kod içinde sabit değil,
`/admin/role-permissions` ekranından (sadece Sistem Yöneticisi'ne görünür)
çalışma zamanında açılıp kapatılabilir.

6 izin anahtarı (`Models/Permissions.cs`): `hotels.manage`, `hotels.delete`,
`hotels.publish`, `users.manage`, `email_settings.manage`, `audit_logs.view`.
Controller'lardaki eski `[Authorize(Roles = "...")]` yerine
`[RequirePermission(Permissions.X)]` kullanılıyor — bu attribute hem kimlik
doğrulamayı hem `PermissionService.IsGrantedAsync(role, permission)`
kontrolünü tek seferde yapar. **İstisna:** `RolePermissionsController`'ın
kendisi hâlâ sabit `[Authorize(Roles = "admin")]` — yoksa bir rol kendi
kendine yetki verebilirdi. Varsayılan izinler (`Script.PostDeployment.sql`):
Yönetici → `hotels.manage`, `hotels.publish`, `users.manage`; Kullanıcı →
`hotels.manage`.

Frontend tarafı: `AuthUserDto`/`AuthContext`'teki `user.permissions: string[]`
dizisi (`GET /api/auth/me` her zaman güncel listeyi döner), UI'da
`user.permissions.includes(PERMISSIONS.X)` ile kontrol edilir
(`src/features/rolePermissions/hooks.ts` → `PERMISSIONS`,
`PERMISSION_LABEL_KEYS` — bu ikincisi i18n anahtarına eşler, ham metin değil).

### API uçları (özet — rol sütunu artık *izin anahtarı*, sabit rol değil)
```
POST   /api/auth/login | /refresh | /logout | /forgot-password | /reset-password
GET    /api/auth/me                   [authenticated] — permissions[] dahil

GET    /api/locale/suggest            public — ziyaretçinin WAN IP'sine göre önerilen dil
                                       ({ locale: "tr"|"en"|"de"|"ru"|null }), bkz. bölüm 4 i18n

GET    /api/hotels                    public — yayında olan oteller (SortOrder'a göre)
GET    /api/hotels/admin/all          [hotels.manage]
POST/PATCH/logo                       [hotels.manage] (PATCH içindeki IsPublished değişimi ayrıca [hotels.publish] ister)
DELETE /api/hotels/:id                [hotels.delete]

GET    /api/hotels/:hotelId/browse?folderId=  public — o klasördeki alt klasör+dosyalar (lazy, tek seviye)
POST   /api/hotels/:hotelId/files     [hotels.manage] — multipart, birden çok dosya

POST/PATCH/DELETE /api/folders        [hotels.manage] — PATCH {id} rename (Name), PATCH {id}/move taşıma (NewParentFolderId), DELETE artık soft delete (bkz. 5.2)
PATCH  /api/folders/reorder           [hotels.manage] — {hotelId, parentFolderId, orderedIds[]} — bir kapsamdaki TÜM kardeşleri yeniden sıralar
PATCH  /api/files/:id                 [hotels.manage] — rename (OriginalName; StoredFileName/fiziksel dosya değişmez)
PATCH  /api/files/:id/move            [hotels.manage] — taşıma (FolderId)
PATCH  /api/files/reorder             [hotels.manage] — {hotelId, folderId, orderedIds[]} — bkz. yukarısı
DELETE /api/files/:id                 [hotels.manage] — artık HARD DELETE değil, soft delete (bkz. 5.2)
GET    /api/files/:id/download|/view|/thumbnail  public — Range destekli / satır içi görüntüleme (thumbnail sadece resimler için, 400px JPEG)

GET    /api/trash?hotelId=            [hotels.manage] — silinmiş klasör+dosya listesi (bkz. 5.2)
POST   /api/trash/folders/:id/restore | /api/trash/files/:id/restore  [hotels.manage]
DELETE /api/trash/folders/:id | /api/trash/files/:id  [hotels.delete] — KALICI silme (gerçek hard delete)
GET    /api/history?hotelId=&page=&pageSize=  [hotels.manage] — rename/move geçmişi (bkz. 5.2)
POST   /api/history/:id/undo          [hotels.manage] — geri al

POST/GET /api/download/zip            public — {fileIds[]} veya {folderId, includeSubfolders}

GET/POST/PATCH /api/users             [users.manage] (+ Sistem Yöneticisi hesap koruması sabit)
GET/PUT        /api/settings/email    [email_settings.manage]
GET            /api/audit-logs        [audit_logs.view]
GET/PUT        /api/role-permissions  [Authorize(Roles="admin")] — sabit, izin sistemine dahil değil
```

### Güvenlik (2026-07-22 — WAN açılışı için sertleştirme)
- JWT access (kısa ömürlü) + refresh token (rotasyonlu, hash'lenmiş DB kaydı)
- Şifreler `BCrypt.Net-Next` ile hash'lenir
- Yüklenen dosyalar hem MIME whitelist hem magic-byte imzasıyla doğrulanır
- Dosya yolları hiçbir zaman istemciden gelmez (ID → DB satırı → fiziksel yol)
- ZIP uçları dosya sayısı üst sınırıyla (`UploadLimits.MaxZipFiles`) korunur
- Rol izinleri dinamik olsa da Sistem Yöneticisi ayrıcalığı ve
  `RolePermissionsController`'ın kendi erişimi kasıtlı olarak sabit kod
- **HTTPS + HSTS**: `Program.cs`'te `UseHttpsRedirection()` ve `UseHsts()`
  middleware'leri (non-Development iken) — tüm trafik şifreli, HSTS header'ı
  tarayıcılara HTTP'ye dönülmeyeceğini garantiler.
- **Security headers**: `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`
  — clickjacking, MIME sniffing, referrer sızıntısı koruması.
- **CORS fail-closed**: `CorsOrigins` boşsa (Production ortamında) startup
  `InvalidOperationException` ile başarısız olur — fail-open fallback yok.
  Development'te sadece localhost origin'lerine izin verilir.
- **Rate limiting** (2 katman):
  1. **Global**: IP başına dakikada ~100 istek (FixedWindowRateLimiter).
  2. **Auth-specific** (`login`, `forgot-password`, `reset-password`): IP
     başına dakikada 8 istek (SlidingWindowRateLimiter, 4 segment) —
     brute-force saldırılarını hedefler. 429 (Too Many Requests) yanıtı verir.
- **Login logging**: başarılı VE başarısız tüm login denemeleri (bilen
  kullanıcı adları) `AuditLog`'a kaydedilir — IP adresi, User-Agent, sonuç
  (200 vs 401). Bilinmeyen kullanıcı adlarına yapılan denemeler `logger.
  LogWarning`'de (server log) tutulur, `AuditLog` UI'sında görülmez (FK
  `UserId NOT NULL` — RDBMS kısıtlaması ve intentional güvenlik tasarımı).
- **AuditLog şeması genişlemesi**: `IpAddress` (NVARCHAR 45) ve `UserAgent`
  (NVARCHAR 500) nullable kolonları — admin `/audit-logs` ekranında
  bağlantı kaynağını ve tarayıcı/istemci tipini takip etmek için.
  Mevcut mutating (POST/PUT/PATCH/DELETE) işlemleri zaten loglanıyordu,
  login denemeleri artık da loglanıyor.

---

## 3.1. `B2B.Configuration` — ortam/hostname'e göre seçim yapan küçük kütüphane

Bağımsız bir class library (`net10.0`), `B2B.API` tarafından referans alınır.

```
B2B.Configuration/
├── ConnectionStringProvider.cs   IConnectionStringProvider — GetConnectionString()
├── ConnectionStringValues.cs     GİTİGNORED — gerçek Dev/Prod connection string sabitleri
├── ConnectionStringValues.cs.example   Şablon (repoya girer)
└── PublicWebUrlProvider.cs       IPublicWebUrlProvider — GetPublicWebUrl() (aynı hostname mantığı)
```

Her ikisi de aynı deseni kullanır: `IHttpContextAccessor` ile gelen isteğin
`Host.Host`'una bakar — `"localhost"` veya `"dev.b2b"` ise Dev, `"b2b"` ise
Prod, başka bir hostname ise `IHostEnvironment.IsProduction()`'a düşer. Bu,
**aynı publish edilmiş binary'nin** hem bu makinedeki dev test sitesini hem
(aynı makinede, farklı hostname ile) prod'u simüle eden bir siteyi doğru
DB'ye bağlayarak servis edebilmesini sağlar; ASPNETCORE_ENVIRONMENT'a
dokunmadan. `PublicWebUrlProvider` aynı mantıkla şifre-sıfırlama/hoş-geldin
e-postalarındaki linklerin hangi hostname'e göre üretileceğini belirler
(`localhost` → `http://localhost:8081`, `dev.b2b` → `http://dev.b2b`,
`b2b`/Prod → `http://b2b`).

> `ConnectionStringValues.cs` gitignored olduğu için yeni bir makinede/klonda
> `.cs.example`'dan kopyalayıp gerçek değerleri girmeniz gerekir — yoksa derleme
> hatası alırsınız.

---

## 4. Frontend — `B2B-Web/` (Expo Router, React Native + Web)

### Rota yapısı
```
app/_layout.tsx                          Font yükleme, QueryClientProvider, LanguageProvider, AuthProvider
app/login.tsx                            Giriş ekranı (GlassBackground, sağ üstte LanguageSwitcher)
app/forgot-password.tsx / reset-password.tsx  Şifremi unuttum akışı
app/(public)/_layout.tsx                 Müşteri kabuğu: HotelPanel (sol menü) + Header + Slot + Footer
app/(public)/index.tsx                   "Hoş geldiniz" + otel kartları (duyarlı grid)
app/(public)/hotel/[hotelId].tsx         FolderBrowser (boundedHeight — sayfa değil, panel içi scroll)
app/admin/_layout.tsx                    Admin kabuğu: TEK üst yatay bar (nav + LanguageSwitcher +
                                          kullanıcı adı + çıkış) — her ekran genişliğinde aynı, ayrı
                                          bir masaüstü sol sidebar varyantı YOK (bkz. 2026-08-04 notu
                                          bölüm 4 sonunda); auth guard
app/admin/index.tsx                      Otel listesi (kart başına Düzenle→modal, Sil, tıkla→içerik sayfası)
app/admin/hotels/new.tsx                 Yeni otel formu
app/admin/hotels/[hotelId]/index.tsx     SADECE içerik/dosya yönetimi (otel bilgisi formu YOK — bkz. aşağı)
app/admin/users/index.tsx | new.tsx | [userId].tsx
app/admin/email-settings.tsx | audit-logs.tsx | role-permissions.tsx
```

**Önemli mimari karar — otel bilgisi düzenleme ile içerik yönetimi ayrıldı:**
Otel adı/açıklama/logo/yayın durumu artık admin otel listesindeki kartın
"Düzenle" linkiyle açılan bir **modal**'da (`src/features/hotels/EditHotelModal.tsx`,
gerçek RN `Modal`, tam ekran overlay) düzenleniyor. Karta (logoya/isme)
tıklamak ise doğrudan `/admin/hotels/[hotelId]` içerik sayfasına götürür —
o sayfada artık SADECE başlık (otel adı + Yayında/Taslak) ve `FolderBrowser`
var, form yok. Aynı desen çakışma-uyarı diyalogunda da kullanıldı (bkz. aşağı).

### Tema sistemi (2026 ortasında koyu lacivert glassmorphism'den değiştirildi)

Site artık **açık, sıcak bir palet** kullanıyor (stonegroup.com.tr'nin kendi
temasından esinlenerek): `tailwind.config.js`'teki özel renkler —
`ink` (50-950, sıcak antrasit, metin/kenarlık için), `paper` (DEFAULT/muted,
kart zemini), `brass` (50-700, **tek accent/seçili-durum rengi** — eskiden
mavi/sapphire kullanılan her yer artık brass), `sand` (#DFCDBE, bg.svg'nin
çizgi rengi), `light-sand` (#F7F2EE, sayfa zemini — sand'dan bir ton açık,
yoksa illüstrasyon zeminle aynı renkte kaybolur).

**Font: tek aile, Poppins (2026-07-29 — eskiden Inter+Playfair Display'den
geçildi).** Kullanıcı önce "Avenir" istedi, ama Avenir lisanslı (Apple/
Linotype) olduğu ve serbest kaynaktan sağlanamadığı için **Poppins**'e
(Google Fonts, `@expo-google-fonts/poppins`) karar verildi. Eskiden
`tailwind.config.js`'teki `fontFamily.sans` (Inter, gövde metni) ve
`fontFamily.serif` (Playfair Display 600SemiBold, `Heading`/`SectionTitle`
başlıkları ve `Header.tsx`'teki "Stone Group" logosu) İKİ AYRI typeface'ti —
artık ikisi de **TEK Poppins ailesinin** farklı ağırlıkları: `sans: ["Poppins"]`
(Poppins_400Regular) / `serif: ["Poppins_600SemiBold"]`. `app/_layout.tsx`'teki
`useFonts` çağrısı üç ağırlık yüklüyor (`Poppins`→400Regular, `Poppins_500Medium`,
`Poppins_600SemiBold` — eski Inter_500Medium/600SemiBold ile aynı "yüklü ama
doğrudan referans verilmeyen" desende, muhtemelen ileride kullanılmak üzere).
**Kural:** `font-sans`/`font-serif` className'leri projede zaten var olan tek
yer (`Typography.tsx`, `Header.tsx`) — yeni bir yerde farklı bir typeface
eklemeyin, tek font ailesi (Poppins) kuralı bilinçli bir karar.

> **2026-07-11 tema tutarlılık turu:** Kullanıcı login sayfasının admin
> sayfalarıyla aynı görünmediğini fark etti (özellikle butonlar). Kök neden:
> `app/login.tsx` paylaşılan `Button`'ı hiç kullanmıyordu — kendi
> `Pressable`+`LinearGradient`'ini elle yazmıştı (farklı borderRadius/padding)
> ve metin renklerini className token'ları yerine ham hex `style={{color:...}}`
> ile veriyordu; logo rozeti de eski koyu-lacivert temadan kalma, hiçbir
> token'a karşılık gelmeyen `#0D1B3E` kullanıyordu. Ayrıca `Typography.tsx`
> içindeki `SectionTitle` hâlâ `text-sapphire-600` kullanıyordu — bu, o zamanki
> **tek** gerçek `sapphire` kullanımıydı (admin VE public tarafında, çünkü
> `SectionTitle` her ikisinde de kullanılıyor). İkisi de düzeltildi: login.tsx
> artık paylaşılan `Button`/ink token'larını kullanıyor, `SectionTitle` artık
> `text-brass-600`, ve **artık kullanılmayan `sapphire` renk bloğu
> `tailwind.config.js`'ten tamamen kaldırıldı** — bundan sonra `sapphire`
> hiçbir yerde tanımlı değil, biri tekrar eklerse bu kasıtsız bir gerilemedir.
> Admin ve public tarafındaki diğer tüm ekranlar (fable ajanlarıyla ayrı ayrı
> denetlendi) zaten paylaşılan `Button`/`Card`/`glass.ts` token'larını doğru
> kullanıyordu — sorun yalnızca login.tsx ve bu tek paylaşılan `Typography`
> satırıyla sınırlıydı. **Kural:** login dahil HİÇBİR ekran kendi buton/gölge/
> renk mantığını elle yazmamalı — her zaman `Button`/`Card`/`glass.ts`
> sabitleri + `ink`/`paper`/`brass` className token'ları kullanılmalı.

- `src/theme/glass.ts` — **tek kaynak, dikkatli kullanın:**
  - `CARD_SHADOW`: paylaşılan `Card`'ın varsayılan gölgesi. **Bilinçli olarak
    hafif** (`0 10px 24px rgba(24,21,15,0.16)`) — daha önce çok ağırdı
    (`0 30px 70px rgba(0,0,0,0.55)`), tek başına duran kartlarda sorun
    değildi ama sık dizilmiş kartlarda (grid/liste) gölgeler birbirine
    karışıp koyu/sert kenar çizgileri oluşturuyordu. **Yine de**: dosya
    grid'i (`FileCard`) ve otel listesi (`HotelRow`) gibi SIK DİZİLMİŞ
    tekrarlayan öğeler `CARD_SHADOW`'u değil, daha da hafif `ROW_SHADOW`'u
    (`style` prop'unda override ederek) kullanır — bkz. `FolderTree.tsx`
    (klasör ağacı satırları da aynı sorunu yaşamıştı, aynı çözüm).
  - `ROW_SHADOW`: sık/bitişik dizilmiş küçük öğeler için (klasör ağacı
    satırları, dosya kartları, otel liste satırları).
  - `BUTTON_SHADOW`, `BADGE_SHADOW`, `ACTIVE_GLOW` (artık brass renginde,
    mavi değil).
  - **Kural:** Yeni bir `Card` kullanımı sık aralıklı bir grid/liste
    içindeyse, varsayılan `CARD_SHADOW`'u miras almasına izin vermeyin —
    `style={[ROW_SHADOW, ...]}` ile override edin, yoksa gölge birikmesi
    (kullanıcı tarafından iki kez rapor edilen bir bug) geri gelir.
- `src/components/ui/GlassBackground.tsx` — tüm sayfaların kökünde
  `assets/bg.svg`'yi tam sayfa arkaplan olarak kullanır. **Dikkat:**
  `<ImageBackground resizeMode="cover">` web'de wrapper'ı SVG'nin kendi
  intrinsic boyutuna (1789×782, viewBox'tan) sabitler, stretch etmez —
  sayfa taşmasına yol açar. Düz `<Image>` de aynı sorunu yaşar (web'de
  `<img>` render eder, `position:absolute` + sadece `top/left/right/bottom:0`
  bir replaced element'i stretch ETMEZ, intrinsic boyutu kullanır). Çözüm:
  `style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}` —
  width/height'ı EXPLICIT olarak da vermek şart.
- `src/components/ui/{Card,Button,Input,Typography}.tsx` — paylaşılan
  primitive'ler. `Button`'ın `primary` varyantı artık brass gradient
  (`#B8903F`→`#7C5F26`), mavi değil.
  - **`Card`'ın border/shadow override tuzağı:** `Card` base className'inde
    zaten `border border-ink-900/10` var; bir tüketicinin kendi
    `className`'ine `border-brass-400` EKLEMESİ, generated stylesheet
    sırası (JSX sırası değil) yüzünden GÜVENİLİR ÇALIŞMAZ — kazanan
    belirsizdir. Renk override'ları her zaman `style` prop'u üzerinden
    (`style={{ borderColor: ... }}`) yapılmalı, className string
    birleştirmesiyle değil. Bu, oturumda iki kez (HotelPanel, FileCard)
    canlı test edilerek doğrulanmış bir bug + fix deseni.
- `src/components/ui/LanguageSwitcher.tsx` — 4 bayrak (emoji, ekstra asset
  yok), `PublicHeader`, login sayfası ve admin nav'da kullanılıyor.
- `src/components/ui/IconGlyphs.tsx` — View tabanlı ikonlar (göz, indirme,
  chevron) — ekstra ikon kütüphanesi yok.
  > **2026-08-04 — istisna: `FolderTree.tsx`'teki `FolderGlyph` artık Font
  > Awesome kullanıyor.** Kullanıcı elle çizilmiş View silüetinin (özellikle
  > "açık klasör" varyantının) yetersiz göründüğünü belirtip açıkça Font
  > Awesome Free istedi. Yeni bağımlılık: **`@expo/vector-icons`** (Expo'nun
  > resmi, managed-workflow uyumlu ikon paketi — `react-native-vector-icons`
  > DEĞİL, o native linking ister). `FolderGlyph` artık
  > `import FontAwesome5 from "@expo/vector-icons/FontAwesome5"` (BARREL'DAN
  > DEĞİL — `@expo/vector-icons`'un ana girişi tüm ikon setlerini eager
  > require ediyor, deep import sadece FA5 fontlarını bundle'a sokuyor) ile
  > `solid` stilde `folder`/`folder-open` render ediyor (`selected`'a göre) —
  > ikisi de Free set'te mevcut, Pro font gerekmiyor. Sabit 18×18 kutu içinde
  > ortalanmış (font async yüklendiği için boş `<Text/>` ile başlangıçta
  > kayma olmasın, ve `folder-open` glyph'i `folder`'dan daha geniş olduğu
  > için expand/collapse'de label kaymasın diye). Font YÜKLEME için
  > `app/_layout.tsx`'teki merkezi `useFonts`'a EKLEME YAPILMADI (bilinçli
  > tercih) — `@expo/vector-icons`'un `createIconSet`'i kendi `Font.loadAsync`'ini
  > kendi `componentDidMount`'ında tetikliyor, otomatik çalışıyor; splash
  > screen'i bu görece nadir kullanılan glyph için ekstra ~370 KB font
  > yüzünden bekletmemek için ayrı bırakıldı — ilk render'da kısa bir boş-ikon
  > karesi görülebilir, rahatsız ederse `...FontAwesome5.font`'u `useFonts`'a
  > eklemek tek satırlık bir çözüm. **Kural**: bu, projede BİLİNÇLİ OLARAK
  > tek gerçek ikon-fontu istisnası — yeni bir yere ikon eklerken varsayılan
  > hâlâ View-tabanlı elle çizim (`IconGlyphs.tsx` deseni); Font Awesome'a
  > sadece kullanıcı açıkça isterse veya View-tabanlı bir silüetin gerçekten
  > yetersiz kaldığı (bu vakada olduğu gibi) durumlarda başvurun, projenin
  > genelini FA'ya taşımaya kalkışmayın.

### i18n — 4 dil (TR/EN/DE/RU), `src/i18n/`

Hafif, özel (kütüphanesiz) bir çözüm — `i18next` değil:
```
src/i18n/translations.ts        tr/en/de/ru için ~90 anahtarlık flat Record<key,string>
                                  (TranslationKey tipi export edilir, template-literal key'ler
                                  için — örn. t(`roles.${role}`) — tip güvenli çalışır)
src/i18n/LanguageContext.tsx     LanguageProvider + useLanguage() → {locale, setLocale, t}
src/i18n/languageStorage.{web,native}.ts   localStorage / SecureStore (tokenStorage ile aynı desen)
```
**Kural:** Yeni bir kullanıcıya görünen metin eklerken HER ZAMAN `t("...")`
kullanın, ham Türkçe string yazmayın — 4 dilin de güncel kalması için tek
yer burasıdır. Rol/izin etiketleri gibi "sabit map" olan yerler (`ROLE_LABELS`,
`PERMISSION_LABELS` gibi eski Türkçe-hardcoded objeler) kaldırıldı; artık
`t(\`roles.${role}\`)` (role zaten `"admin"|"manager"|"staff"`, birebir
`roles.admin` vb. anahtarla eşleşir) veya `PERMISSION_LABEL_KEYS[key]` (bir
i18n anahtarına eşleyen map) + `t(...)` kullanılıyor. Tarih/saat formatlama
da (`audit-logs.tsx`) `locale`'e göre BCP47 tag seçiyor (`tr-TR`/`en-US`/
`de-DE`/`ru-RU`).

> **2026-07-31 — varsayılan dil `tr`'den `en`'e değişti, IP-tabanlı dil önerisi
> eklendi.** `DEFAULT_LOCALE` (`translations.ts`) artık `"en"` — hem
> `LanguageProvider`'ın ilk state'i hem çeviri fallback'i bu değeri kullanıyor.
> Ayrıca **backend'e yeni, auth gerektirmeyen bir uç nokta eklendi**:
> `GET {API base}/locale/suggest` → her zaman `200` + `{ locale: "tr"|"en"|
> "de"|"ru"|null }` (`null` = fikir yok — LAN istemcisi veya IP-coğrafya
> belirsiz; bu durumda mevcut/varsayılan dil aynen kalır). Bu, `apiUrl.web.ts`
> ile aynı "isteğin nereden geldiğine göre runtime'da karar ver" desenini
> farklı bir eksende (hostname yerine ziyaretçi IP'si) tekrarlıyor. Frontend
> tarafı: yeni **`src/i18n/localeSuggest.{web,native}.ts`** çifti
> (`languageStorage.{web,native}.ts` ile birebir aynı platform-ayrım deseni)
> — web sürümü `apiClient.get("/locale/suggest", {timeout:3000})` ile
> (kendi zaten hostname-tabanlı `API_URL`'i kullanarak, host hardcode YOK)
> çağırıyor, herhangi bir hata/timeout/malformed cevapta sessizce `null`
> dönüyor (fail-soft); native sürüm hiç ağ isteği atmadan doğrudan `null`
> dönüyor (native zaten build-time'da tek backend'e sabit, bkz. `apiUrl.native.ts`).
> `LanguageContext.tsx`'teki restore effect'i genişletildi: `languageStorage.get()`
> ile kayıtlı bir tercih varsa eskisi gibi onu kullanıyor; YOKSA
> `suggestLocale()`'i çağırıp `null` olmayan bir sonucu state'e yazıyor —
> **bilinçli olarak `languageStorage.set()` ile HİÇ persist edilmiyor**, bu
> yüzden IP önerisi her oturum/cihazda yeniden değerlendiriliyor, kullanıcının
> `LanguageSwitcher` üzerinden yaptığı EXPLICIT seçimin aksine "yapışmıyor".
> **Kural:** bu iki yol (persist edilen explicit seçim vs. persist edilmeyen
> IP önerisi) `LanguageContext.tsx` içinde net ayrı tutulmalı — IP önerisi
> yoluna asla `languageStorage.set()` çağrısı eklenmemeli, yoksa bir sonraki
> oturumda kullanıcının kendi seçimini sessizce ezebilir.

### Öne çıkan özellikler / desenler

- **Admin nav — tek üst bar, masaüstü sol sidebar kaldırıldı (2026-08-04)**:
  `app/admin/_layout.tsx` eskiden iki ayrı varyanttı — masaüstünde (`lg:`)
  sol dikey sidebar (nav üstte, `LanguageSwitcher`+kullanıcı adı+çıkış
  sidebar'ın ALTINA pinlenmiş), mobilde ayrı bir üst yatay bar (nav +
  dil + kullanıcı + çıkış hepsi aynı satırda). Kullanıcı nav ve dil
  seçeneklerinin her zaman sayfanın ENİNDE olmasını istedi — sol sidebar
  varyantı tamamen kaldırıldı, mobildeki üst-bar deseni (zaten çalışır
  durumdaydı) artık TEK layout olarak her genişlikte kullanılıyor. Bu
  admin bölümündeki TÜM route'ları (`Slot` üzerinden) etkiliyor. **Kural**:
  bu dosyaya yeniden bir "geniş ekranda farklı görünüm" eklemeden önce
  bu kasıtlı tek-layout kararını göz önünde bulundurun — HotelPanel'deki
  (`src/features/hotels/HotelPanel.tsx`, public taraf) katlanabilir sol
  panel bundan tamamen ayrı/ilgisiz bir mekanizma, karıştırmayın.
- **Duyarlı grid** (`src/lib/useGridColumns.ts`): masaüstü 5, tablet 4, geniş
  telefon 3, telefon 2 sütun. Saf CSS yüzde tabanlı grid. **(2026-07-30)**
  Eşikler artık ham `useWindowDimensions()` genişliği yerine grid'in KENDİ
  ölçülen konteyner genişliğine uygulanıyor — hook'un dönüş tipi
  `number`'dan `[columns, onLayout]`'a değişti, çağıran taraf `onLayout`'u
  grid'i saran `View`'e bağlamak ZORUNDA (bağlamazsa sessizce eski
  window-genişliği davranışına düşer, hata vermez). Üç kullanım yeri de
  (`FolderBrowser.tsx` dosya grid'i, `(public)/index.tsx` ve `admin/index.tsx`
  otel kart grid'i) güncellendi. **Neden**: uygulamadaki her grid sabit
  genişlikte bir yan panelin (HotelPanel, admin nav rail, FolderBrowser'ın
  yeniden boyutlandırılabilir ağaç paneli) yanında oturuyor — ham pencere
  genişliğiyle sütun sayısı, örneğin HotelPanel daraltıldığında (aşağıya
  bakın) gerçekten boşalan yatay alana hiç tepki vermiyordu (sadece bir eşiği
  aşan tam pencere resize'ı tepki verirdi). **Kural**: yeni bir grid eklerken
  `useGridColumns()`'un döndürdüğü `onLayout`'u mutlaka grid'in saran
  `View`'ine bağlayın, yoksa sütun sayısı o grid'in gerçek genişliğini değil
  pencere genişliğini izler.
- **HotelPanel** (`src/features/hotels/HotelPanel.tsx`): masaüstünde SOL
  sidebar'da her otel için bir SATIR (küçük logo solda + otel adı sağda,
  hepsi en uzun otel adına göre ölçülmüş EŞİT genişlikte — `onLayout` ile
  ölçüp `useState`'e yazan iki-fazlı bir render deseni), mobilde yatay
  şerit (pill'ler). Seçili satır **brass** kenarlık + glow ile vurgulanır
  (mavi değil — kullanıcı özellikle "mavi dışında" istedi). Logolarda
  `BADGE_SHADOW` ile hafif "zeminde duruyor" hissi. **(2026-07-30) Katla/
  genişlet düğmesi**: sidebar artık `lg:w-64` (genişletilmiş, isim+logo
  satırları, logo `w-11`→`w-14`'e büyütüldü) ile `lg:w-24` (daraltılmış,
  sadece `HotelRailItem` — logo-only, isim `Tooltip` ile hover'da görünür)
  arasında sağ üstteki bir `NavArrowIcon` düğmesiyle geçiş yapıyor. Mobil
  `HotelPill` şeridine dokunulmadı. Bu panelin daraltılması yukarıdaki
  `useGridColumns` container-aware değişikliğiyle birlikte çalışıyor —
  daraltınca dosya/otel-kart grid'i boşalan alanı gerçekten kullanıyor.
  **(2026-07-30, aynı gün ikinci tur)** İlk sürüm `localStorage`'da
  kullanıcının son tercihini hatırlıyordu (`hotelPanelState.ts`,
  `treePanelWidth.ts` ile aynı desen) ve varsayılan genişletilmişti —
  kullanıcı "her zaman kapalı gelsin" isteyince bu persistence katmanı
  TAMAMEN kaldırıldı (dosya silindi): `collapsed` artık her sayfa
  yüklemesinde sabit `useState(true)` ile başlıyor, oturum içinde düğmeyle
  açılabiliyor ama yenilemede her seferinde tekrar kapalıya dönüyor. Yeni
  bir "kullanıcı tercihini hatırla" isteği gelirse `treePanelWidth.ts`
  deseni yeniden uygulanabilir, ama şu an bilinçli olarak YOK.
- **FolderBrowser** (`src/features/folders/FolderBrowser.tsx`): hem admin
  hem müşteri tarafında paylaşılan klasör/dosya gezgini. Eski
  breadcrumb+ızgara klasör gezinme kaldırıldı, yerine **`FolderTree`**
  (`FolderTree.tsx`) geldi — sol tarafta VS Code tarzı, genişletilebilir bir
  klasör ağacı (her klasör `browse?folderId=X` ile lazy fetch edilir, backend'de
  "tüm hiyerarşiyi tek seferde getir" uç noktası YOK). Her ağaç satırının
  sağında küçük bir indirme ikonu var (o klasörü doğrudan indirir, seçmeden).
  Sağ tarafta sadece SEÇİLİ klasörün dosyaları grid olarak listelenir.
  `boundedHeight` prop'u (sadece public otel sayfasında `true`): sayfa değil,
  ağaç ve dosya paneli KENDİ İÇİNDE scroll eder (admin içerik sayfası da artık
  bunu kullanıyor, çünkü otel-bilgisi formu oradan modal'a taşındığı için
  engel kalmadı). `belowHeaderContent` prop'u — başlık/araç çubuğu satırından
  sonra, dosya grid'inden önce gösterilecek isteğe bağlı içerik (örn. admin'de
  Yayında/Taslak durumu — kullanıcı "Klasörü indir satırı Yayında'nın üzerinde
  olsun" dediği için bilhassa bu sıraya kondu).
- **Klasör/dosya adı düzenleme + klasör/dosya taşıma** (2026-07-18): `FolderTree`
  satırlarında ve `FolderBrowser`'daki dosya kartlarında (mevcut sil/indir
  ikonlarının yanına, aynı hep-görünür-küçük-daire-ikon desende, `isAdmin`
  gate'i altında) rename (kalem) ve move (ok) ikonları eklendi — bu projede
  context-menu/kebab-menü YOK, hiç olmadı, buradan sonra da eklenmedi.
  Rename için **`src/components/ui/PromptDialog.tsx`** (yeni, genel amaçlı —
  `ConfirmDialog`'un aynı `Modal`+`Card` iskeleti ama statik mesaj yerine
  kontrollü `Input`; hem klasör hem dosya rename'i reuse ediyor). Move için
  **`src/features/folders/FolderPickerTree.tsx`** (`FolderTree`'nin
  sadeleştirilmiş salt-okunur bir kopyası — aynı lazy `browse?folderId=`
  deseni, silme/indirme yok, en üstte "Kök dizin" satırı) +
  **`FolderPickerModal.tsx`** (aynı `Modal`+`Card` sarmalayıcı). Klasör
  taşımada `excludeFolderId` prop'u o düğümü genişletilemez/seçilemez yapar
  — alt ağacı hiç erişilemez kaldığı için "kendi altına taşıma" client-side'da
  da otomatik engellenir (backend `MoveAsync` da aynısını 400 ile reddediyor,
  bkz. bölüm 3 `FolderService`). `hooks.ts`'e `useRenameFolder`/`useMoveFolder`/
  `useRenameFile`/`useMoveFile` eklendi — dördü de (taşıma iki farklı
  `browse` görünümünü etkilediği için) GENİŞ `["hotels", hotelId]`
  invalidation yapıyor, `FolderTree`'nin kendi `deleteFolder` mutation'ıyla
  aynı gerekçe. **Not**: ne backend'de ne frontend'de kardeş isim tekilliği
  kontrolü YOK (create/rename'de de hiç olmadı) — aynı klasörde iki aynı
  isimli alt klasör/dosya olabilir, bilinçli bir tutarlılık kararı.
  **(2026-07-29) İndirme UI'ı artık admin'de tamamen gizli**: admin
  (`isAdmin`) içerik yönetiyor, tüketmiyor — bu yüzden `FolderTree`'nin
  satır-sonu indirme ikonu, `FileCard`'ın grid indirme ikonu/"İndir"
  butonu ve `MultiSelectToolbar`'ın toplu indirme + "klasörü indir"
  butonları hepsi `isAdmin`/`showDownload` prop'uyla admin'de render
  edilmiyor (görüntüle/rename/move/delete admin'de aynen kalıyor). Public
  tarafta `FolderTree`'nin indirme ikonu da bu turda konum değiştirdi:
  eskiden chevron'dan ÖNCE (satırın en solunda) idi, artık klasör/otel
  adının SAĞINDA (`Body` etiketinden hemen sonra, kebab menüsünden önce).
  **Kural**: yeni bir indirme kontrolü eklerken hem admin/public ayrımını
  (`showDownload`/`isAdmin` deseni) hem konumunu (public: ad'ın sağı) bu
  örnekle tutarlı tutun.
  **(2026-07-18 devamı)** İkon-only butonlar (view/download/delete/rename/move)
  için **`src/components/ui/Tooltip.{web,native}.tsx`** eklendi — bu projede
  ilk hover-tooltip deseni. RN'in çekirdek `Pressable` `onHoverIn`/`onHoverOut`'u
  kullanıyor. **İlk sürüm (etiket ikonun solunda, in-tree `position:absolute`)
  aynı gün içinde bug olarak değiştirildi**: `TreeRow`'da (rename/move/sil/indir,
  4'e kadar ikon) ve `FileCard`'ın iki ikon kümesinde (2 ve 3 ikon) sadece
  6px (`gap-1.5`) ara olduğu için soldaki etiket neredeyse her zaman komşu
  ikonun/metnin üzerine biniyordu. **Kök neden sadece bu değildi** — react-native-web
  her `View`'a otomatik `position:relative` + `zIndex:0` uyguluyor (yani her
  View kendi stacking context'i), bu yüzden in-tree bir etiket ne yöne
  taşınırsa taşınsın (yukarı/aşağı da denendi) ya bir sonraki satırın opak
  arkaplanının ALTINDA kalıyor ya da `FileCard`'ın `overflow-hidden`
  `Card`'ı tarafından kırpılıyordu — **tek bir in-tree konum hiçbir tüketici
  için sağlam çalışmıyordu**. Kalıcı çözüm: **web sürümü `react-dom`'un
  `createPortal`'ı ile etiketi `document.body`'ye, `position:"fixed"`,
  hover anında `getBoundingClientRect()`'ten hesaplanan koordinatlarla
  basıyor** (kontrolün sağ kenarına hizalı, altında yer yoksa üstüne
  dönüyor, scroll/resize'da gizleniyor, `zIndex:1000` — tüm RNW stacking
  context'lerinin üstünde, hiçbir overflow'a tabi değil). Native sürüm
  (`Tooltip.native.tsx`) hâlâ etiketsiz pass-through `Pressable` (touch'ta
  hover yok). Yeni devDependency: `@types/react-dom` (react-dom 19 kendi
  tiplerini içermiyor). **Yeni bir yere eklerken**: bu iki ayrı platform
  dosyasını (import path `components/ui/Tooltip`, `.web`/`.native` otomatik
  seçiliyor) bozmadan kullanın — in-tree/absolute bir tooltip yaklaşımına
  geri dönmeyin, yukarıdaki stacking-context tuzağına tekrar düşersiniz.
  **(2026-07-18, ikinci bug)** Portal'a geçtikten hemen sonra "ikonun tam
  üzerindeyken tooltip görünmüyor, sadece kenarlarında görünüyor" bildirildi.
  Kök neden `node_modules/react-native-web` kaynağından doğrulandı: `Tooltip`
  o sırada dış sarmalayıcı olarak (hover'ı yakalamak için) bir `Pressable`
  kullanıyordu, ama her tüketicinin `children`'ı ZATEN başka bir `Pressable`
  (asıl ikon butonu). RNW'nin `Pressable`'ı `useHover`'ı sabit `contain: true`
  ile bağlıyor — her `Pressable` `pointerenter`'da bubbling bir
  `react-gui:hover:lock` `CustomEvent` yayınlıyor, ve kendi hedefi olmayan
  bir lock alan HER ATA `Pressable` kendi hover'ını zorla bitiriyor
  (`onHoverOut` tetikliyor). Yani iç ikon butonunu hover etmek dış
  `Tooltip` sarmalayıcısının hover'ını anında iptal ediyordu — sadece
  `rounded-full` iç butonun DAİRESİ DIŞINDAKİ kare köşe kırıntılarında
  (DOM hit-test iç Pressable'a değmediği için lock hiç yayınlanmıyor)
  etiket görünür kalıyordu — bildirilen "kenarlarda görünüyor" hatası
  BİREBİR bu mekanizmadan kaynaklanıyordu. **Düzeltme**: dış sarmalayıcı
  `Pressable`'dan düz bir `View`'e çevrildi, `onHoverIn`/`onHoverOut` yerine
  ham `onPointerEnter`/`onPointerLeave` kullanılıyor (RNW `View` bunları
  doğrudan DOM'a iletiyor) — bu, Pressable'ın lock/unlock protokolüne hiç
  girmiyor. **Kural**: `Tooltip`'in (ya da benzer bir hover-sarmalayıcının)
  içine bir `Pressable`/interaktif buton koyacaksanız, dış sarmalayıcı ASLA
  `Pressable`'ın `onHoverIn`/`onHoverOut`'unu kullanmasın — ham
  `onPointerEnter`/`onPointerLeave`'e (veya `onMouseEnter`/`onMouseLeave`'e)
  sahip düz bir `View` kullanın, yoksa iç-içe Pressable'larda aynı
  hover-lock tuzağına tekrar düşersiniz.
  Ayrıca **dosya rename artık uzantıyı değiştiremez**: `PromptDialog`'a
  opsiyonel `suffix` prop'u eklendi (sabit, düzenlenemez metin, input'un
  yanında) — `FolderBrowser.tsx`'teki `splitExtension()` dosya adını SON
  `.`'a göre böler (`.env` gibi öncesi boş adlar bölünmez, tamamı editable
  kalır), `PromptDialog` sadece base'i düzenletir, submit'te uzantı geri
  eklenir. Klasör rename `suffix` vermeden aynı `PromptDialog`'u kullanmaya
  devam ediyor, davranışı değişmedi.
- **Klasör/dosya öncelik sırası — sürükle-bırak** (2026-07-29): admin'de
  hem `FolderTree` satırları (her seviye kendi kardeşleri arasında, çapraz
  seviye sürükleme YOK — klasörler arası taşıma zaten ayrı "taşı" özelliği)
  hem `FolderBrowser`'ın dosya grid'i sürükle-bırakla yeniden sıralanabiliyor.
  Kütüphane eklenmedi — yeni paylaşılan `src/lib/dnd/useDragReorder.{web,native}.ts`
  hook'u, mevcut ağaç/grid resize splitter'ıyla (`FolderBrowser.tsx`) AYNI
  ham DOM event deseniyle (ref→`HTMLElement`, `mousedown`/`mousemove`/`mouseup`)
  **web-only** çalışıyor (native'de no-op stub — `Tooltip.web/.native` ile
  aynı dosya-uzantı deseni); dropzone yüklemesi de zaten aynı gerekçeyle
  web-only'ydi. Hook iki geometri modu destekliyor: `"list"` (FolderTree —
  sadece Y ekseninde sıralı satırlar arası konum) ve `"grid"` (dosya grid'i —
  sarmalayan flex-wrap layout'ta en yakın komşuyu (X+Y) bulup önüne/arkasına
  yerleştirme). Backend: `Folder.SortOrder` (zaten vardı, hiç kullanılmıyordu)
  ve yeni `MediaFile.SortOrder` — `PATCH /api/folders/reorder` /
  `PATCH /api/files/reorder` (bkz. bölüm 3 API uçları) bir kapsamdaki TÜM
  kardeşleri tek seferde 0..n-1'e yeniden yazıyor. `hooks.ts`'teki
  `useReorderFolders`/`useReorderFiles`, `useCreateFolder`/`useDeleteFolder`
  ile AYNI dar `["hotels", hotelId, "browse", <scope>]` invalidation'ını
  kullanıyor (reorder her zaman tek bir browse kapsamını etkiliyor, taşımanın
  aksine iki kapsamı birden değil) + `onMutate`'te cache'i hemen yeni sırayla
  güncelleyip (optimistic) `onSuccess`'te invalidate ediyor, böylece sürükleme
  sunucu round-trip'ini beklemiyor.
  > **2026-07-29 (devamı) — sürükleme hiç çalışmıyordu, iki bağımsız bug**
  > (ilk yayınlandığı gün fark edildi, aynı gün düzeltildi): İlk şüphe
  > (kullanıcı raporu) tutma kolunun `Pressable` içine iç içe konmasından
  > kaynaklanan bir event-propagation çakışmasıydı (RNW `Pressable`'ın kendi
  > responder sistemi `mousedown`'u `document` seviyesinde dinliyor —
  > incelendi, `node_modules/react-native-web` kaynağından doğrulandı) —
  > **bu hipotez YANLIŞ çıktı**, gerçek kök nedenler tamamen farklıydı,
  > gerçek tarayıcıda (headless Chrome + CDP, gerçek `mousedown`/`mousemove`/
  > `mouseup`) test edilerek bulundu:
  > 1) **Dosya grid'i**: `FileCard`'daki tutma kolu görünmüyordu/tıklanamıyordu
  > çünkü YANLIŞ YERDE render ediliyordu — `<Tooltip><View ref={dragHandleRef}
  > className="absolute top-2 left-2 ...">` deseninde `absolute` doğrudan
  > Tooltip'in ÇOCUĞUNA konmuştu. `Tooltip.web.tsx`'in kendi sarmalayıcı
  > `View`'i hiçbir layout stili taşımıyor (sadece `cursor:pointer`) — RNW'nin
  > her View'a varsayılan verdiği `position:relative` yüzünden bu sarmalayıcı,
  > `absolute` çocuğun konumlandığı gerçek "containing block" oluyor (istenen
  > "aspect-square" resim kapsayıcısı değil). Karttaki DİĞER tüm çocuklar
  > (thumbnail, view/download, rename/move/delete) zaten `absolute` olduğu
  > için akıştan çıkmış durumda; SADECE Tooltip sarmalayıcısı normal-akış
  > (in-flow) tek çocuk olarak kalıyor ve flex-column içinde resim karesinin
  > ALT KENARINA itiliyordu — orada dosya adı etiketiyle hem görsel hem
  > DOM hit-testing (`elementsFromPoint`) sırasında ÇAKIŞIYORDU (ekran
  > görüntüsünde dosya adı metninin üzerinde bindirilmiş küçük ikon
  > kırıntıları olarak görüldü). **Düzeltme**: `absolute top-2 left-2`
  > artık Tooltip'i SARAN yeni bir dış `View`'de — Tooltip'in kendi çocuğu
  > sadece `w-6 h-6 rounded-full ...` (konumsuz) — tıpkı rename/move/delete
  > kümesinin zaten kullandığı "dış absolute wrapper + içeride birden çok
  > Tooltip" deseni gibi. `Tooltip.web.tsx`'in kendisi DEĞİŞMEDİ (paylaşılan,
  > başka her tüketici tarafından zaten doğru kullanılıyordu). **Kural**:
  > `Tooltip`'in DOĞRUDAN çocuğuna `position:absolute` KOYMAYIN — her zaman
  > Tooltip'i saran ayrı bir `absolute` `View` kullanın.
  > 2) **Klasör ağacı**: tutma kolu (`TreeRow`, `absolute` DEĞİL, normal
  > `w-4 h-5` flex item) doğru render oluyordu ve `mousedown`/`mousemove`
  > sorunsuz tetikleniyordu, ama BAŞKA bir bug'a çarpıyordu: sürüklemeyi
  > BAŞLATMAK (herhangi bir kardeşin `dragging` prop'unu değiştirip TÜM
  > kardeş `FolderTreeNode`'ları bir kez daha render'a zorlaması) her
  > ÇÖKMÜŞ (collapsed) düğümde gizli duran bir sonsuz döngüyü tetikliyordu:
  > `FolderTreeNode`'un kendi `children = data?.folders ?? []` (yani
  > `useBrowseHotel(hotelId, folder.id, isExpanded)` çökmüşken `enabled:false`
  > olduğu için `data` SONSUZA DEK `undefined` kalıyor) her render'da TAZE bir
  > boş `[]` üretiyor; `useDragReorder`'ın resync `useEffect`'i `[items]`'i
  > REFERANSA göre karşılaştırdığı için bu taze referans effect'i her seferinde
  > yeniden tetikliyor, `setLiveItems([])` çağrısı (önceki state'ten referans
  > olarak farklı) yeni bir render'a yol açıyor, o da yeni bir `[]` üretiyor —
  > kendi kendini besleyen bir sonsuz döngü ("Maximum update depth exceeded",
  > gerçek tarayıcıda doğrulandı, sayfa CPU'yu kilitleyip donuyordu).
  > **Düzeltme**: `useDragReorder.web.ts`'teki resync effect artık `items`
  > referansı yerine `items.map(getId).join(",")` (içerik bazlı, stabil bir
  > primitive) bağımlılığı kullanıyor — `?? []` gibi kaynağı `undefined`
  > olan yerlerde her render'da taze referans üretilmesi artık effect'i
  > yeniden tetiklemiyor. **Kural**: bir hook'un `useEffect` bağımlılığı bir
  > ARRAY/OBJECT prop'sa ve o prop çağıran tarafta `x?.y ?? []` gibi bir
  > fallback'ten geliyorsa (React Query'nin `data` alanı `enabled:false`
  > iken sonsuza dek `undefined` kalabildiği gibi), bağımlılığı referans
  > yerine içerikten türetilmiş bir primitive'e çevirin — yoksa "kaynak
  > veri hiç yok" durumu render başına yeni bir referans üretip sessiz bir
  > sonsuz döngü tuzağı kurar (sadece bir şey o bileşeni fazladan bir kez
  > daha render'a zorladığında ateşlenir, o yüzden ilk bakışta görünmez).
- **Admin araç çubuğu ikiye bölündü** (2026-08-03): `AdminFolderToolbar.tsx`
  artık tek bir bileşen export etmiyor — `useAdminFolderToolbarState(hotelId,
  folderId, onFolderDeleted)` (paylaşılan state/mutation hook'u) +
  `AdminFolderActions` (Yeni Klasör/Web sürümü oluştur/Çöp Kutusu/"Bu klasörü
  sil") + `AdminFolderDropzone` (sadece sürükle-bırak kutusu + Yükle butonu)
  export ediyor. Sebep: kullanıcı sürükle-bırak kutusunda SADECE Yükle
  butonu kalsın, diğer aksiyonlar `FolderBrowser`'ın başlık satırında "Seç"
  butonunun yanında görünsün istedi — bu iki görsel bölge `adminToolbar`
  prop'unun tek bir `AdminFolderToolbar` örneğiyle doldurulduğu eski
  yapıda ayrı DOM konumlarına taşınamıyordu, bu yüzden state hook'u
  çağıran taraf (`app/admin/hotels/[hotelId]/index.tsx`) tek bir
  `adminState` üretip iki alt bileşene prop olarak geçiriyor.
  `FolderBrowser`'a yeni bir `adminActions` slot prop'u eklendi (mevcut
  `adminToolbar` slot'unun yanına) — başlık satırında `MultiSelectToolbar`
  ile aynı sarmalayıcı `View` içinde yan yana render ediliyor.
  `MultiSelectToolbar`'daki "Seç" butonu de bu turda kendi özel
  `Pressable`+pill stilinden paylaşılan `Button` (`variant="secondary"`)
  bileşenine çevrildi — artık diğer aksiyon butonlarıyla aynı görünüyor.
  **Kural**: bu üç parça (hook + iki bileşen) birbirinden bağımsız
  kullanılmamalı — `AdminFolderActions`/`AdminFolderDropzone` ikisi de
  AYNI `useAdminFolderToolbarState` çağrısının döndürdüğü `state` nesnesini
  almalı (ayrı ayrı hook çağırırlarsa state senkronizasyonu bozulur).
- **Sürükle-bırak yükleme** (`src/features/folders/AdminFolderToolbar.tsx` +
  `dragDropUpload.ts`): dropzone web-only (native'de sadece resim seçici
  buton). Tarayıcının `FileSystemEntry` API'siyle (`webkitGetAsEntry`)
  bırakılan bir KLASÖRÜN İÇİNDEKİ alt klasör/dosya yapısı okunur, mevcut
  tekli klasör-oluşturma uç noktası tekrar tekrar çağrılarak sunucuda aynı
  hiyerarşi kurulur (klasör adı çakışmasında OTOMATİK BİRLEŞTİRİR — soru
  sormaz, çünkü "üzerine yaz" bir klasör için "sil ve yeniden oluştur"
  anlamına gelip veri kaybına yol açardı). **Dosya adı çakışmasında** ise
  toplu bir onay penceresi ("Üzerine yaz"/"Kopya olarak yükle"/"İptal")
  çıkar — bu, tüm sayfayı kaplayan gerçek bir RN `Modal`'dır (ilk sürümde
  toolbar'ın kendi küçük kutusuna göre `absolute inset-0` idi, tüm ekranı
  kaplamıyordu — kullanıcı raporuyla `Modal`'a çevrildi, `EditHotelModal`
  ile aynı desen).
- **Dosya önizleme** (`src/features/folders/FileThumbnail.tsx`): `kind`'a
  göre ÜÇ ayrı görünüm — `image` kendi önizlemesi, `video` koyu zemin+oynat
  butonu, **diğer her şey (PDF/belge)** açık zemin + sayfa ikonu + gerçek
  uzantı (`fileTypeLabel(mimeType)`). Önceden `image` olmayan HER ŞEY yanlışlıkla
  video görünümü alıyordu (PDF'ler oynatma butonuyla görünüyordu) — düzeltildi.
  **2026-07-20 — thumbnail iyileştirmesi**: `hasThumbnail` bayrağı `true` ise
  image bileşeni `GET /api/files/{id}/thumbnail` URL'sinden 400px JPEG thumbnail'ı
  gösterir (tarayıcı cache'leyerek; `Cache-Control: max-age=31536000, immutable`).
  Bu mekanizma sayfa açma performansını iyileştirir (browse'da küçük thumbnail).
  **2026-07-31 düzeltmesi — eski resimlerin fallback'i artık `/download` DEĞİL,
  `/view`**: `hasThumbnail=false` olan (400px thumbnail'i hiç oluşmamış) eski
  resimler önceden doğrudan `/api/files/{id}/download`'a (gerçek orijinal,
  10-20+ MB olabiliyor) düşüyordu — grid'de küçük bir kart göstermek için koca
  orijinal dosya indiriliyordu. Kök neden `admin/hotels/4?folderId=23` klasörü
  üzerinden canlı test edilerek bulundu: bu klasördeki görsellerin
  `WebOptimizedFileId` kopyaları zaten üretilmişti (bkz. bölüm 5.3) ve `/view`
  uç noktası doğru şekilde küçük kopyayı döndürüyordu (curl ile doğrulandı,
  288KB), ama grid'in kendi fallback zinciri `/view`'ı hiç denemeden doğrudan
  `/download`'a atlıyordu. Düzeltme: `fileThumbnailUrl()`'deki fallback
  `/view`'e çevrildi — `/view` zaten sunucu tarafında `WebOptimizedFileId`
  varsa onu, yoksa orijinali döner (bkz. 5.3, `ResolveViewFileAsync`), yani bu
  tek satır hem grid'i hem (zaten `/view` kullanan, bkz. hemen altı)
  büyütülmüş önizlemeyi aynı substitüsyondan otomatik faydalandırıyor. Tıklanıp
  büyütülen önizleme (`ImagePreviewModal.tsx`, `downloadFile.viewFileUrl()`)
  de aynı `/view` uç noktasını kullanıyor — yani artık ne grid ne zoom hiçbir
  zaman "sadece bir küçük kart/önizleme göstermek için" gerçek orijinali
  indirmiyor, WebOptimizedFileId kopyası olmayan görüntüler için ikisi de
  (bilinçli olarak) orijinale düşüyor. **`/download` (gerçek indirme butonu)
  hâlâ HER ZAMAN orijinali döner, değişmedi.**
- **İndirme/görüntüleme** (`src/lib/download/downloadFile.{web,native}.ts`):
  platform bazlı. `downloadZip({hotelId, folderId, includeSubfolders})` VEYA
  `{hotelId, fileIds})` — **`folderId` olmadan "tüm otel" indirilemez**,
  backend bunu desteklemiyor (kök seviye "klasörü indir" bu yüzden mevcut
  kök dosyaların `fileIds` listesini gönderir).
- **Yükleme** (`src/lib/upload/appendFile.{web,native}.ts`): platform bazlı
  FormData ekleme.

### Veri katmanı
- `@tanstack/react-query` — sunucu state. Query key deseni:
  `["hotels", hotelId, "browse", folderId]` — bu YAPIYI KORUYUN, çünkü
  klasör/dosya oluşturma/silme/yükleme mutation'ları `invalidateQueries`'i
  bu key'e göre yapıyor (örn. sürükle-bırak sonrası: geniş bir
  `["hotels", hotelId]` invalidation'ı tüm ağaç+grid'i tazeler).
- `axios` (`src/lib/api/client.ts`) — `baseURL` artık `src/lib/api/apiUrl.{web,native}.ts`'ten
  geliyor: web'de `window.location.hostname`'e göre RUNTIME'da çözülüyor
  (aynı `dist/` her IIS sitesinde doğru API'ye bağlanır), native'de
  build-time `EXPO_PUBLIC_API_URL` aynen korunuyor (bkz. bölüm 1.2
  "Ortam değişkenleri", 2026-07-15 notu).
- Auth token (`tokenStorage.{web,native}.ts`) ve dil tercihi
  (`languageStorage.{web,native}.ts`) aynı platform-ayrımlı desende: web'de
  `localStorage`, native'de `expo-secure-store`.

---

## 5. Bilinen notlar / gelecek işler / dikkat edilmesi gerekenler

- **Şifremi unuttum / hoş geldin e-postaları artık VAR** (eski bir not bunun
  bilinçli olarak eklenmediğini söylüyordu — o not geçersiz, özellik
  `AuthService.ForgotPasswordAsync/ResetPasswordAsync` + `UserService`'te
  yeni kullanıcıya hoş geldin e-postası olarak eklendi). SMTP ayarları admin
  panelinden (`/admin/email-settings`, DB'de saklanır) girilmeden e-posta
  gönderilemez.
- `npm audit`'teki kalan uyarılar sadece geliştirme araçlarına ait, üretim
  koduna girmiyor.
- Swagger yalnızca Development ortamında açık.
- **ImageSharp bağımlılığı: v3.1.11 (v4.0+ DEĞİL)** — backend'de resim
  thumbnail'ı oluşturma (`B2B.API/B2B.API.csproj`). v4.0+ Six Labors
  commercial lisansı gerektirir ve build-time hata verir; v3.1.x serbest
  yazılımdır.
- **Gölge/border override deseni** (yukarıda tema bölümünde ayrıntılı):
  `Card` kullanan yeni bir bileşen sık dizilecekse mutlaka `ROW_SHADOW`
  override'ı düşünün; renk override'larını `className` değil `style`
  üzerinden yapın.
- **Yeni bir kullanıcıya görünen metin = mutlaka `t("...")`** — i18n
  altyapısı kurulduktan sonra hiçbir yeni ekranın ham Türkçe string
  içermemesi gerekir.
- **`ZipService`/`downloadZip` kök seviyede recursive değil** — bu bilinen
  bir sınırlama, "tüm oteli tek tıkla indir" istenirse backend'e yeni bir
  uç nokta (örn. `folderId=null` + `includeSubfolders` desteği) eklemek
  gerekir.
- Yerel `http://dev.b2b/b2b.api` IIS sitesi **kasıtlı olarak hep Development**
  ortamı (test amaçlı) — gerçek prod SGAPPSRV'de, oraya hiçbir zaman bu
  makineden doğrudan yazma/silme işlemi yapılmadı (kullanıcı bunu her
  seferinde kendisi yönetti/publish etti).
- **WAN açılışı — Fortigate + güvenlik sertleştirmesi (2026-07-22)**:
  - Fortigate VIP: WAN 443 → SGAPPSRV:443 (TCP, orijinal IP korunmalı —
    `AuditLog`'daki `IpAddress` gerçek client IP'sini görmek için).
  - DNS + sertifika: win-acme / Let's Encrypt, IIS'te HTTPS binding.
  - rate limiting, HTTPS redirect, HSTS, security headers, CORS fail-closed
    — 2026-07-22'de Program.cs'e eklendi. Fortigate tarafı: IPS, DoS policy,
    logging ("All Sessions") — kullanıcı kendi yapılandırması.
  - `appsettings.Production.json` mutlaka güncellenmeli: `CorsOrigins` →
    gerçek subdomain, `Jwt:*Secret` → rotate, `SeedAdmin:Password` → değiştir.
    Bu dosya `.gitignore`'da (secret'lar içerir), deploy öncesi manuel
    güncellenmelidir — repo'daki şablon `.example` dosyasından kopyalanmalı.
  - Bilinmeyen kullanıcı adlarına yapılan login denemesi: `logger.LogWarning`'de
    (server application log) görülür, `/admin/audit-logs` UI'sında değil
    (intentional — FK kısıtlaması + enum protection balance).

---

## 5.1. Klasör adlarında çoklu dil desteği (2026-07-27)

`Folder.Name` (tek string) → 4 kolon: `NameTr` (zorunlu), `NameEn`/`NameDe`/`NameRu` (opsiyonel, NULL).
Ayrı bir çeviri tablosu yerine düz kolonlar — dil sayısı sabit (4 dil, `Locale = "tr"|"en"|"de"|"ru"`),
ayrı tablo join maliyetine katlanmaya değmez. **Backend locale bilmiyor** (backend tarafında `LanguageProvider`
hiç yoktur) — `Folder` DTO'ları 4 alanın hepsini taşır; **frontend'de TEK merkezi `resolveFolderName(folder, locale)`**
yardımcı fonksiyonu (`src/features/folders/folderName.ts`) aktif dile göre seçim yapar (boşsa TR'ye düşer —
`LanguageContext.t()`'in fallback deseni taklit edilir). **Tek istisna**: ZIP indirme gerçek bir dosya çıktısı
ürettiği için, `ZipService` opsiyonel `locale` parametresi alır; `ZipDownloadRequest.Locale` (query param, default `"tr"`)
backend'e taşınır.

**Şema değişikliği**: `B2B.API/Migrations/` altında yeni bir `AddFolderNameLocales.cs` migration dosyası manuel
oluşturulmalı (şu 4 operasyonu içerir):
```csharp
migrationBuilder.RenameColumn("Name", "Folders", "NameTr");
migrationBuilder.AddColumn<string>("NameEn", "Folders", maxLength: 200, nullable: true);
migrationBuilder.AddColumn<string>("NameDe", "Folders", maxLength: 200, nullable: true);
migrationBuilder.AddColumn<string>("NameRu", "Folders", maxLength: 200, nullable: true);
```
`AppDbContextModelSnapshot.cs` ve `B2B.Database/Tables/Folders.sql` de Name → NameTr + 3 NULL kolon ile senkronize 
haldedir. Database publish (`SqlPackage.exe` veya SSDT) kullanıcı tarafından yapılır.

> **2026-07-28 — bu değişiklik `hotels/{id}/browse` uçlarında 500'e yol açtı, kök neden
> + veri kaybı**: Dev DB'de bu değişiklik EF migration'ıyla (`dotnet ef database update`)
> DEĞİL, kullanıcının doğrudan SSDT/dacpac publish'iyle uygulandı (bu makinede
> `__EFMigrationsHistory` tablosunun hiç var olmadığı doğrulandı — dev DB'nin şeması
> baştan beri sadece SSDT/dacpac ile kuruluyor, `dotnet ef database update` hiç
> çalıştırılmamış olabilir; bkz. bölüm 1'deki "iki parçalı şema" anlatımı, bu makinede
> muhtemelen sadece dacpac yolu kullanılıyor). **İki farklı bug aynı anda ortaya çıktı:**
> 1) `B2B.Database/Tables/Folders.sql`'de `NameTr` yanlışlıkla `NULL` olarak yazılmıştı
> (olması gereken: `NOT NULL` — eski `Name` kolonu hep `NOT NULL`'du, plan.md da
> `NameTr`'yi "zorunlu" olarak tanımlıyor; muhtemelen `NameEn/De/Ru` ile aynı satırdan
> kopyalanırken kaçırıldı). 2) SSDT'nin dacpac publish'i, EF migration'ındaki
> `RenameColumn("Name","NameTr")`'nin aksine, `CREATE TABLE` tanımından DDL diff'i
> hesaplıyor — "bu bir rename" bilgisini YOK sayıyor, bunun yerine eski `Name` kolonunu
> DROP edip yeni (nullable) `NameTr`/`NameEn`/`NameDe`/`NameRu` kolonlarını ADD ediyor.
> Sonuç: **26 klasörün (id 2, 13, 18-41) orijinal adı geri dönülemez şekilde silindi**
> (hepsi `NameTr = NULL` oldu; sadece migration sonrası oluşturulan tek bir klasör,
> id 42, gerçek veriyle sağlam kaldı). `NameTr` nullable olduğu ve gerçekten NULL değerler
> içerdiği için, EF'in non-nullable `string NameTr` property'sini materialize etmeye
> çalışırken `SqlDataReader.GetString()` `System.Data.SqlTypes.SqlNullValueException: Data
> is Null` fırlatıyordu (`FolderService.cs` `BrowseHotelAsync`, `db.Folders...ToListAsync()`
> satırı) — bu, klasörü olan HER otelin browse uç noktasını 500'e düşürüyordu (klasörsüz
> oteller, ör. o an hotel 2, etkilenmiyordu — bu yüzden ilk bildirilen "hotel 2" ile ilk
> testte "hotel 2 çalışıyor" çelişkili görünmüştü, asıl tetikleyici klasör VARLIĞIydı).
> **Düzeltme (dev DB'ye doğrudan `sqlcmd` ile uygulandı, EF migration kullanılmadı —
> kullanıcı talimatı)**: NULL `NameTr` satırları `'Adsız Klasör ' + Id` placeholder'ıyla
> dolduruldu (orijinal adlar kurtarılamaz — kullanıcı bu 26 klasörü admin panelinden elle
> yeniden adlandırmalı), sonra `ALTER TABLE Folders ALTER COLUMN NameTr NVARCHAR(200) NOT
> NULL` ile kolon NOT NULL'a çevrildi. `B2B.Database/Tables/Folders.sql`'deki `NameTr`
> tanımı da `NOT NULL`'a düzeltildi (bir sonraki dacpac publish'te bu bug'ın geri
> gelmemesi için — kaynak dosya artık DB'nin gerçek/istenen haliyle eşleşiyor).
> **Kural**: SSDT/dacpac ile EF'in 5 tablosundan birine (Users/RefreshTokens/Hotels/
> Folders/Files) şema değişikliği uygularken, bir EF migration'ı `RenameColumn` kullanıyorsa
> SSDT tarafında bunun karşılığı YOKTUR — dacpac publish bunu DROP+ADD olarak uygular ve
> **veri kaybeder**. Böyle bir rename'i veri kaybetmeden uygulamak için ya gerçek `dotnet
> ef database update` çalıştırılmalı (SSDT değil), ya da SSDT tarafında elle bir
> `.refactorlog` girişi/`sp_rename` script'i eklenmeli. Ayrıca yeni bir nullable/not-null
> kolon eklerken `Folders.sql`'i EF modelindeki (`Folder.cs`, nullable reference type
> annotasyonu) nullability ile birebir karşılaştırın — ikisi arasında sessiz bir
> uyuşmazlık (nullable DB kolonu + non-nullable C# property) sadece o kolonda gerçekten
> NULL bir satır olduğunda, çalışma zamanında `SqlNullValueException` olarak patlar;
> derleme zamanında hiçbir uyarı vermez.

## 5.2. Çöp Kutusu (Trash) ve Değişiklik Geçmişi / Undo (2026-07-30)

Sebep: bir kullanıcı toplu seçili resimleri yanlışlıkla kalıcı sildi, geri
alma yolu yoktu; klasör/dosya rename/move'ları da aynı şekilde geri alınamaz
haldeydi. İki bağımsız ama ilişkili mekanizma eklendi — **soft delete**
(Çöp Kutusu) ve **rol-bağımsız rename/move geçmişi** (Undo). Migration:
`B2B.API/Migrations/20260730120000_AddTrashAndChangeHistory.cs`.

**Soft delete**: `Folder`/`MediaFile`'a `IsDeleted`, `DeletedAt`(nullable),
`DeletedById`(nullable) eklendi. `FolderService.DeleteAsync`/`FileService.DeleteAsync`
artık satırı DB'den/diskten SİLMİYOR, sadece bu üç alanı yazıyor — mevcut
`BrowseHotelAsync` sorguları `IsDeleted == false` filtresi aldı (silinen bir
öğe normal browse/tree/grid'de bir daha hiç görünmüyor). Gerçek hard delete
sadece yeni **`PurgeAsync`** ile oluyor (`DELETE /api/trash/...`,
`[hotels.delete]` — sıradan silmeden daha yüksek bir yetki seviyesi, bilinçli).
`ListTrashAsync` `IsDeleted == true` olan satırları döner.

**Değişiklik geçmişi**: yeni `EntityChangeLog` tablosu — her `RenameAsync`/
`MoveAsync` çağrısı (Folder VE File için, `FolderService`/`FileService`
içinde) kendi işleminden ÖNCEKİ değeri (`FolderRenameSnapshot`/
`FolderMoveSnapshot`/`FileRenameSnapshot`/`FileMoveSnapshot` — bkz.
`B2B.API/Models/EntityChangeLog.cs`) JSON'a serialize edip bir satır ekliyor.
**`AuditLog`'dan kasıtlı olarak ayrı bir tablo**: `AuditLog` Sistem
Yöneticisi'nin kendi işlemlerini atlıyor (bkz. bölüm 3, `AuditLogService`),
ama undo HERKESİN (Admin dahil) işlemi için çalışmalı — bu yüzden
`EntityChangeLog`'a yazma rol bağımsız, hiç atlanmıyor. `ChangeHistoryService.
UndoAsync` `PreviousValueJson`'ı deserialize edip **aynı `RenameAsync`/
`MoveAsync`'i tekrar çağırarak** geri alıyor. `EntityId` üzerinde FK YOK —
kayıt sonradan `PurgeAsync` ile kalıcı silinmiş olabilir, `ChangeHistoryDto`'daki
`currentName*`/`currentOriginalName` alanları bu durumda `null` döner
(frontend "kalıcı olarak silindi" notu gösterir).

> **2026-07-31 — undo artık kendi tersini loglamıyor, orijinal satırı siliyor
> (davranış değişikliği).** İlk sürümde undo, `RenameAsync`/`MoveAsync`'i
> normal (loglayan) haliyle çağırdığı için geri alma işlemi kendi tersini
> yeni bir satır olarak ekliyor, eski satır ise yerinde kalıyordu — yani bir
> undo, geçmiş listesinde İKİ satıra yol açıyordu (eski + tersi). Kullanıcı
> bunu yanlış buldu: undo'nun beklenen sonucu geçmişten o girdinin tamamen
> KAYBOLMASI, yeni bir "tersine çevirme" izi bırakmaması. Düzeltme: hem
> `FolderService.RenameAsync`/`MoveAsync` hem `FileService.RenameAsync`/
> `MoveAsync`'e sona opsiyonel `bool logChange = true` parametresi eklendi
> (var olan çağrı yerleri — controller'lar — etkilenmedi, hepsi varsayılanı
> kullanıyor); `EntityChangeLogs.Add(...)` bloğu `if (logChange)` içine
> alındı. `ChangeHistoryService.UndoAsync` artık 4 branch'te de
> `logChange: false` geçiyor, çağrı başarıyla dönünce (`RenameAsync`/
> `MoveAsync` throw ETMEZSE) orijinal `log` satırını `db.EntityChangeLogs.
> Remove(log)` ile siliyor. Hedef entity artık yoksa (`NotFound` fırlarsa)
> silme hiç çalışmıyor — başarısız bir undo denemesi kullanıcının geçmiş
> satırını kaybetmesine yol açmıyor.

**Frontend** (`B2B-Web`, admin-only): `src/features/folders/TrashHistoryModal.tsx`
— `AdminFolderToolbar`'daki yeni "Çöp Kutusu" butonuyla açılan, iki sekmeli
(Button toggle, bu projede Tabs primitive'i yok) bir `Modal`. "Çöp Kutusu"
sekmesi `useTrash(hotelId)` ile silinen klasör/dosyaları listeler (geri
yükle herkese açık `[hotels.manage]`, kalıcı sil sadece `user.permissions`
`PERMISSIONS.HotelsDelete` içeriyorsa görünür + `ConfirmDialog` ister).
"Geçmiş" sekmesi `useChangeHistory(hotelId)` ile rename/move kayıtlarını
listeler, her satırda `RestoreIcon`'lu bir "Geri Al" (`useUndoChange`)
butonu var. Yeni hook'lar (`src/features/folders/hooks.ts`): `useTrash`,
`useChangeHistory` (`useQuery`, sırasıyla `["hotels", hotelId, "trash"]` /
`["hotels", hotelId, "history"]` key'leri, ikisi de modal kapalıyken
`enabled:false` — `useBrowseHotel`'in lazy-fetch deseniyle aynı), `useRestoreFolder`/
`useRestoreFile`/`usePurgeFolder`/`usePurgeFile`/`useUndoChange` (mutation,
hepsi rename/move hook'larıyla aynı geniş `["hotels", hotelId]` prefix
invalidation'ını kullanıyor — bu prefix zaten `["hotels", hotelId, "trash"]`
ve `["hotels", hotelId, "history"]`'yi de kapsıyor, React Query key eşleşmesi
dizi-prefix bazlı). Yeni ikon: `RestoreIcon` (`IconGlyphs.tsx`, saat yönünün
tersine dönen bir yay + ok ucu — dosyadaki border-circle/border-triangle
tekniğiyle, ekstra ikon kütüphanesi yok). Yeni tipler
(`src/features/hotels/types.ts`): `TrashedFolderDto`, `TrashedFileDto`,
`TrashListDto`, `ChangeHistoryDto` — backend DTO'larıyla birebir (camelCase).
4 dilde `trash.*` i18n anahtarları eklendi (`src/i18n/translations.ts`).
**Move geçmişinde hedef klasör adı GÖSTERİLMİYOR** (kasıtlı — backend bunu
çözmüyor, sadece "taşındı" + kim/ne zaman; kapsam dar tutuldu).

**Kural**: Bundan sonra `Folder`/`MediaFile` üzerinde yeni bir "silme" yolu
eklerseniz (örn. toplu silme, farklı bir controller) mutlaka `DeleteAsync`
(soft) ile `PurgeAsync` (hard) ayrımına uyun — hiçbir yeni kod satırı
`db.Folders.Remove(...)`/`db.MediaFiles.Remove(...)` çağırmasın, sadece
`FolderService.PurgeAsync`/`FileService.PurgeAsync` bunu yapmalı (aksi halde
o silme yolu Çöp Kutusu'nu bypass eder, kullanıcı yine geri alamaz).

**`B2B.Database` tarafı**: `Folders.sql`/`Files.sql`'e aynı 3 kolon
(`IsDeleted`/`DeletedAt`/`DeletedById`, `CreatedById`/`UploadedById` ile aynı
Users FK + index deseni) + yeni `EntityChangeLogs.sql` (Hotels'e Cascade,
Users'e Restrict FK) eklendi, `.sqlproj`'un `<ItemGroup>`'una (bu proje
dosyaları wildcard değil, TEK TEK listeliyor) kayıt edildi. Bu turda hiç
`RenameColumn` yok (sadece `AddColumn`/`CreateTable`), yani hemen üstteki
2026-07-28 DROP+ADD veri kaybı tuzağı bu değişiklik için geçerli değil —
EF migration'daki tip/nullable/default tanımlarıyla birebir karşılaştırılarak
doğrulandı. Henüz dev DB'ye publish EDİLMEDİ (bölüm 1.3'teki kural gereği bu
kullanıcının kendi VS build + `SqlPackage.exe`/Publish Database adımı).

> **UYARI — bu turda fark edilen, bu değişiklikle İLGİSİZ ama aktif bir risk**:
> `Folders.sql`'de `NameTr` şu an tekrar `NULL` (olması gereken `NOT NULL` —
> bkz. yukarıdaki 2026-07-28 notu, bu kolon tam da bu yüzden `NOT NULL`'a
> düzeltilmişti) ve kaldırılmış olması gereken eski `[Name]` kolonu hâlâ
> dosyada duruyor; `Files.sql`'de de `SortOrder` satırı dosyanın geri kalanıyla
> hizalı değil. Bu satırlar 2026-07-30 oturumu BAŞLAMADAN ÖNCE zaten
> `git status`'ta değişiklik olarak görünüyordu (muhtemelen kullanıcının kendi
> WIP'i) — bu oturumdaki hiçbir ajan bunlara dokunmadı. Bir sonraki dacpac
> publish'inden ÖNCE bu iki dosya gözden geçirilmeli, yoksa 2026-07-28'deki
> veri kaybı senaryosu (`NameTr NULL` + SSDT DROP+ADD) tekrar edebilir.

## 5.3. Web-optimize görsel önizleme — yüksek çözünürlüklü resimlerin yavaş açılması (2026-07-31)

Sebep: otel klasörlerindeki gerçek kamera/telefon fotoğrafları büyük/yüksek
çözünürlüklü olduğu için `GET /files/{id}/view` (tam boyutlu orijinali stream
eden uç, `ImagePreviewModal.tsx`'in büyütülmüş görsel için kullandığı) açılırken
gözle görülür şekilde bekletiyordu. Çözüm **sadece `/view`'i** etkiler —
`/download` her zaman gerçek orijinali döner, hiç dokunulmadı.

**Tasarım kararı — görünür ama gizlenmiş bir alt klasör + orijinal üzerinde
self-reference FK, dosya adı eşleştirmesi YOK:** Kullanıcı literal olarak "aynı
klasör içinde yeni bir klasör oluştur" istedi. Bunu gerçek bir `Folder` +
gerçek `MediaFile` satırları olarak uyguladık, ama `Folder.IsSystemGenerated`
(yeni `bool`, varsayılan `false`) bayrağıyla: `FolderService.BrowseHotelAsync`
bu klasörleri hem klasör listesinden filtreliyor hem `folderId` ile doğrudan
içine girilmeye çalışılırsa (tahmin edilmiş/sızmış id) `NotFound` atıyor —
yani bu klasör admin/müşteri arayüzünde HİÇBİR ZAMAN görünmüyor/gezilemiyor.
Eşleştirme dosya adına göre DEĞİL, yeni `MediaFile.WebOptimizedFileId`
(nullable, self-reference, **FK constraint YOK** — `EntityChangeLog.EntityId`
ile aynı emsal, bkz. bölüm 5.2) ile: orijinal satır kendi web-optimize
kopyasının id'sini tutuyor. `FilesController.View` artık
`FileService.ResolveViewFileAsync(file)` çağırıp `WebOptimizedFileId` doluysa
(ve hedef satır/fiziksel dosya hâlâ mevcutsa) o kopyanın path'ini döndürüyor —
**`ImagePreviewModal.tsx`/`downloadFile.viewFileUrl()` hiç değişmedi**, aynı
URL'i çağırıyor, sunucu tarafında şeffaf bir substitution.

**Neden gizli-klasör + FK (dosya adı eşleştirmesi değil)**: rename orijinali
kırar, ayrı bir `Folder` olması `FolderService`'in zaten var olan Path-prefix
tabanlı soft-delete/restore/purge cascade'ini (bkz. 5.2) SIFIR ek kod ile
kopyalara da uyguluyor — kopya klasörü her zaman orijinalin O ANKİ üst
klasörünün DOĞRUDAN çocuğu (bkz. aşağıdaki invaryant), bu yüzden üst klasör
silinince/geri yüklenince kopyalar da otomatik sürükleniyor.

**Boyut/kalite**: 1920px genişlik (400px'lik browse-grid thumbnail'inden
büyük — bu tam-ekran önizleme için, grid için değil), JPEG q85, aspect-ratio
korunuyor/hiç upscale yok — mevcut `GenerateThumbnailAsync`'in birebir aynı
deseni (`FileService.cs`, `WebOptimizedWidth`/`WebOptimizedJpegQuality`
sabitleri).

**Yeni yüklemeler otomatik, buton sadece backfill için**: `SaveUploadedFilesAsync`
artık `Kind == Image` için thumbnail'in yanında web-optimize kopyayı da
otomatik üretiyor (best-effort — thumbnail'in aksine başarısızlık yüklemeyi
İPTAL ETMİYOR, sadece o görsel `/view`'de orijinale düşüyor). Admin panelindeki
**"Web sürümü oluştur"** butonu (`AdminFolderToolbar.tsx`, `Çöp Kutusu`
butonunun yanında) sadece bu özellikten ÖNCE yüklenmiş görselleri backfill
ediyor — `FileService.GenerateWebOptimizedForFolderAsync(hotelId, folderId,
userId)`, `POST /api/files/generate-web-optimized` (`[hotels.manage]`),
sadece o klasördeki (recursive DEĞİL, mevcut lazy tek-seviye browse deseniyle
tutarlı) `WebOptimizedFileId == null` olan görselleri işliyor — buton tekrar
tekrar basılabilir, zaten işlenmiş görseller atlanıyor (ucuz no-op catch-up).
Tek bozuk/decode edilemeyen görsel batch'in tamamını durdurmuyor, `Failed`
sayacına yazılıyor. Sonuç `{totalImages, processed, alreadyOptimized, failed}`
frontend'de `useToast` ile tek satır özet olarak gösteriliyor
(`webOptimize.*` i18n anahtarları, 4 dil).

**Invaryant — kopya HER ZAMAN orijinalin güncel üst klasörünün gizli çocuğunda
yaşar**: `FileService.MoveAsync`/`MoveManyAsync` bir orijinali taşırken
`WebOptimizedFileId` doluysa kopyayı da HEDEF klasörün gizli alt klasörüne
taşıyor (`RelocateLinkedWebOptimizedCopyAsync`) — bu olmasa Path-prefix
cascade invaryantı bozulurdu (kopya eski üst klasörün altında kalır, o klasör
silinince orijinal etkilenmeden kopya çöpe düşerdi). Aynı şekilde
`DeleteAsync`/`DeleteManyAsync`/`RestoreAsync`/`PurgeAsync` (File, tekil/toplu)
kopyayı orijinalle birlikte soft-delete/restore/hard-delete ediyor
(`SoftDeleteLinkedWebOptimizedCopyAsync`/`RestoreLinkedWebOptimizedCopyAsync`,
`PurgeAsync` kopyayı `IsDeleted` durumuna bakmaksızın koşulsuz siliyor) — yoksa
hem disk sızıntısı olur hem `FileService.ListTrashAsync`/`FolderService.
ListTrashAsync`'e (ikisi de artık `IsSystemGenerated`'i filtreliyor) kopyalar
kendi başına kafa karıştırıcı bir çöp kutusu satırı olarak sızardı.
`ZipService.ResolveEntriesAsync` de hem `fileIds` hem `folderId` (+
`includeSubfolders`) yollarında `IsSystemGenerated` filtreliyor — recursive
"klasörü indir" gizli alt klasöre inip düşük çözünürlüklü kopyaları asıl
dosyaların yanına bir daha eklemesin diye.

**Şema**: `Folder.IsSystemGenerated` (`bool`, `NOT NULL DEFAULT 0`),
`MediaFile.WebOptimizedFileId` (`int?`, FK YOK). Migration:
`B2B.API/Migrations/20260731120000_AddWebOptimizedImages.cs` (+ `.Designer.cs`,
+ `AppDbContextModelSnapshot.cs` güncellendi) — sadece `AddColumn`, hiç
`RenameColumn` yok, bu yüzden 2026-07-28'deki SSDT DROP+ADD veri kaybı sınıfı
bu değişiklik için geçerli değil. `B2B.Database/Tables/Folders.sql`/`Files.sql`
aynı iki kolonla senkronize edildi. **Henüz dev DB'ye publish EDİLMEDİ** —
bölüm 1.3'teki kural gereği bu kullanıcının kendi VS build +
`SqlPackage.exe`/Publish Database adımı; o adım atlanırsa hem "Web sürümü
oluştur" butonu hem yeni yüklemelerdeki otomatik web-kopya üretimi
`WebOptimizedFileId`/`IsSystemGenerated` kolonları DB'de yok diye 500 verir.
