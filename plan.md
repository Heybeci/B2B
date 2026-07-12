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
# üzerinden — http://localhost/b2b/b2b.api — geçer, bkz. bölüm 1.1)
npm run dev:server
# eşdeğeri: dotnet run --project B2B.API

# Terminal 2 — Frontend / Expo web (http://localhost:8081)
npm run dev:app
# eşdeğeri: npm run web -w B2B-Web  ->  expo start --web
```

Mobilde test için: `cd B2B-Web && npm run android` veya `npm run ios` (ya da
`npm run dev:app` sonrası Expo Go ile QR kod okutma).

### Swagger (API dokümantasyonu + test arayüzü)

IIS'teki B2B.API uygulaması (bkz. bölüm 1.1) çalışırken: **http://localhost/b2b/b2b.api/swagger**

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
| `B2B-Web/.env` | `EXPO_PUBLIC_API_URL=http://localhost/b2b/b2b.api/api` — frontend'in backend'e nasıl ulaşacağı (2026-07-11'de port-tabanlı yerine path-tabanlı yapıya geçti, bkz. bölüm 1.1) |
| `B2B.API/Properties/launchSettings.json` | Backend'in dinlediği port (`http://localhost:4000`); IIS profili `ASPNETCORE_ENVIRONMENT=Development` (yerel `http://b2b/b2b.api` test sitesi kasıtlı olarak hep Development — gerçek prod SGAPPSRV'de) |

### Veritabanı bağlantısı — artık appsettings'te değil, **hostname'e göre** seçiliyor

Connection string'ler `appsettings.*.json`'dan tamamen kaldırıldı; onun
yerine `B2B.Configuration` projesindeki `ConnectionStringProvider`, **gelen
HTTP isteğinin hostname'ine** bakarak Dev/Prod seçer (bkz. 3.1):
- `localhost` → Dev (`Server=localhost\SQLEXPRESS;Database=SgB2bHotelMedia;...`)
- `b2b` → Prod (`Server=SGAPPSRV\SQL2019;Database=SgB2bHotelMedia;...`)
- Başka bir host → `IHostEnvironment.IsProduction()`'a düşer

Bu sayede **aynı derlenmiş uygulama** hem bu makinedeki `http://localhost:8081`
dev sunucusuna hem yerel `http://b2b/b2b.api` IIS test sitesine (farklı
hostname, aynı binary) hizmet ederken doğru veritabanına bağlanır — IIS
sitesinin `ASPNETCORE_ENVIRONMENT`'ını değiştirmeye gerek kalmaz. Aynı mantık
`PublicWebUrlProvider` ile e-posta bağlantıları (şifre sıfırlama, hoş geldin)
için de geçerli: hangi hostname'den istek geldiyse o hostname'e uygun
frontend URL'i üretilir.

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
(`http://localhost/b2b/b2b.api`, bkz. hemen altındaki alt bölüm) ise
kasıtlı olarak farklı/daha basit bir kurulum kullanıyor — publish
gerektirmiyor.

### Yerel dev/test sitesi — `http://localhost/b2b/b2b.api` (publish GEREKTİRMEZ)

IIS yapısı **path-tabanlı** bir modele göre kurulu: `Default Web Site`
(port 80, physical path `C:\inetpub\wwwroot`, boş/placeholder) altında her
proje kendi klasör adıyla bir Application olarak duruyor —
`/b2b` (B2B-Web) ve onun altında iç içe `/b2b/b2b.api` (B2B.API); aynı
desenle `/sg-portal` ve `/sg-portal/sg-portal.api` (ayrı proje, SG-Portal —
o projenin dosyalarına hiç dokunulmadı). `/b2b/b2b.api`'nin physical path'i
ham proje klasörü (`C:\Develop\Workspaces\SG-B2B\B2B.API`, `publish/` DEĞİL);
içindeki `web.config` (`.NET SDK`'nin `dotnet build` sırasında otomatik
ürettiği dosya, `hostingModel="InProcess"`) `bin\Debug\net10.0\B2B.API.exe`'yi
işaret ediyor — yani `dotnet build B2B.API` her çalıştığında IIS'in
çalıştıracağı `.exe` de güncellenmiş oluyor, publish adımı gerekmiyor.

> **2026-07-11 — 503 "Application Shutting Down" ve kök nedeni**: `/b2b/b2b.api`
> başlangıçta `DefaultAppPool`'u kullanıyordu — ama bu pool'un tek worker
> process'inde (`w3wp.exe`) zaten `/sg-portal/sg-portal.api` **InProcess**
> olarak çalışıyordu. IIS, **aynı app pool içinde birden fazla InProcess
> ASP.NET Core uygulamasına izin vermiyor** (daha önce farklı bir kurulumda
> "HTTP Error 500.35" olarak yaşanan, kavramsal olarak aynı tuzak — burada
> ANCM isteği hiç yönlendiremediği için sürekli 503 dönüyordu, event log'da
> B2B.API'ye ait tek bir kayıt bile yoktu). **Düzeltme**: B2B.API için ayrı,
> özel bir App Pool oluşturuldu — `b2b.api AppPool` (No Managed Code,
> `ApplicationPoolIdentity`) — ve `/b2b/b2b.api` bu pool'a taşındı. Bu pool
> adı **bilinçli olarak eskiden var olan isimle aynı** seçildi: SQL
> Server'da `IIS APPPOOL\b2b.api AppPool` login'i ve `storage/` klasöründeki
> ACL girdisi, pool bir kez silinmiş olmasına rağmen hâlâ duruyordu — aynı
> isimle yeniden oluşturmak bu izinleri (deterministik virtual account SID
> sayesinde) sıfırdan ayarlamaya gerek kalmadan geri kazandırdı. Yeni bir
> makinede/ortamda bu izinler yoksa: SQL Server'da
> `IIS APPPOOL\b2b.api AppPool` için bir Windows login'i + `SgB2bHotelMedia`
> üzerinde `db_datareader`/`db_datawriter`, ve `B2B.API/storage`
> klasöründe Modify izni gerekir.

> **Bilinen tuzak**: InProcess hosting modelinde ASP.NET Core uygulaması
> IIS worker process'inin (`w3wp.exe`) içinde çalışır; worker process yakın
> zamanda bir istek almışsa (yani zaten ayaktaysa), `bin\Debug\net10.0\B2B.API.dll`
> (ve ilgili dosyalar) kilitli olabilir ve `dotnet build` "dosya kullanımda"
> hatası verebilir — bu, `dotnet run` için zaten belgelenen kilitlenme
> sorunuyla aynı sınıf (bkz. "Sık kullanılan diğer komutlar" altındaki not).
> Bu durumda önce `Stop-WebAppPool -Name "b2b.api AppPool"`, build'den sonra
> `Start-WebAppPool -Name "b2b.api AppPool"` gerekir (worker process'i
> yeniden başlatmak da INProcess modelde genelde yeterli:
> `Restart-WebAppPool -Name "b2b.api AppPool"`).
>
> **2026-07-12 — `/b2b` artık gerçek frontend serve ediyor**: `/b2b`
> uygulamasının physical path'i ham proje klasöründen `B2B-Web/dist`'e
> çevrildi (`Set-ItemProperty IIS:\Sites\Default Web Site\b2b physicalPath`),
> ve `dist/` bölüm 1.2'de anlatılan `EXPO_PUBLIC_BASE_PATH=/b2b` export'uyla
> üretildi. `http://localhost/b2b` artık uçtan uca doğrulanmış durumda:
> statik rotalar, dinamik rotalar (`/hotel/5`), asset'ler (`_expo/static/*`,
> favicon — `/b2b` prefix'li) ve `admin`/`Pass1234` ile giriş (yerel
> SQLEXPRESS DB'ye gerçek bağlantı) hepsi 200/başarılı. **Dikkat**: bu `dist/`
> klasörü `EXPO_PUBLIC_BASE_PATH`/`EXPO_PUBLIC_API_URL` override'ıyla
> üretildiği için normal `npm run web:export` (prod ayarlarıyla) tekrar
> çalıştırılırsa bu path-prefix'li halin ÜZERİNE YAZILIR ve
> `http://localhost/b2b` yeniden bozulur — yerel testi tazelemek için her
> zaman bölüm 1.2'deki `EXPO_PUBLIC_BASE_PATH` komutuyla export almak gerekir.
> Dev ortamında günlük çalışma zaten `npm run dev:app` (Expo dev sunucusu,
> `:8081`) üzerinden yürüyor — bu IIS static export akışı ayrı, isteğe bağlı
> bir yerel doğrulama/prod-simülasyon yoludur.
>
> **`http://b2b/b2b.api` (hostname-tabanlı, prod'u simüle eden ayrı bir test
> sitesi) hâlâ bu makinede kurulu değil** — bugünkü kapsam sadece `localhost`
> path-tabanlı senaryosuydu, bu ayrıca ele alınmadı.

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

`B2B-Web/.env` (dev, `http://localhost/b2b/b2b.api/api`) ve
`B2B-Web/.env.production` (`http://b2b/b2b.api/api`) — derleme anında JS
bundle'ına gömülür, sonradan değiştirilemez; adres değişirse yeniden export
gerekir.

> **2026-07-12 — yerel `/b2b` alt-path'i için export**: Gerçek prod frontend'i
> hostname'in KÖKÜNDE (`http://b2b/`) serve edilirken, yerel dev/test'te
> frontend `Default Web Site` altında bir ALT-uygulama (`http://localhost/b2b/`)
> olarak serve ediliyor (bkz. bölüm 1.1) — Expo'nun static export'u ise
> varsayılan olarak TÜM asset referanslarını (`/_expo/static/*`, favicon)
> kök-mutlak üretir, bu da nested-application senaryosunda 404'e yol açar.
> Bunu çözmek için `app.json` yanına **`app.config.js`** eklendi: `EXPO_PUBLIC_BASE_PATH`
> env değişkeni set edilmişse Expo'nun `expo.experiments.baseUrl` alanını o
> değere ayarlıyor (app.json'daki diğer tüm alanları — `typedRoutes` dahil —
> olduğu gibi koruyarak), set değilse config'e hiç dokunmuyor. Bu yüzden
> **normal `npm run web:export` davranışı DEĞİŞMEDİ** (prod hâlâ kök-mutlak
> path üretir) — sadece yerel `/b2b` testi için AYRICA şu şekilde export
> almak gerekiyor:
> ```powershell
> $env:EXPO_PUBLIC_API_URL="http://localhost/b2b/b2b.api/api"
> $env:EXPO_PUBLIC_BASE_PATH="/b2b"
> npm run web:export
> Remove-Item Env:EXPO_PUBLIC_API_URL, Env:EXPO_PUBLIC_BASE_PATH
> ```
> IIS'te `/b2b` uygulamasının physical path'i bu `dist/` klasörüne
> ayarlanmalı (bkz. bölüm 1.1 — daha önce ham proje klasörünü gösteriyordu,
> bu artık düzeltildi). Env değişkenleri shell'de set edilmişse `.env*`
> dosyalarından önceliklidir; `.env`/`.env.production` dosyaları bu süreçte
> hiç değiştirilmedi.

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
bağlantı REST API'dir (`EXPO_PUBLIC_API_URL`).

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
| `FolderService` | İç içe klasör CRUD, **materialized path** (`Folder.Path`, örn. `/1/4/9/`) |
| `FileService` | Dosya yükleme, MIME whitelist + magic-byte doğrulama (`FileTypeSniffer`) |
| `ZipService` | Toplu indirme planı: `{fileIds}` VEYA `{folderId, includeSubfolders}` — **`folderId=null` ile "tüm otel recursive" desteklenmiyor**, kök seviye indirme her zaman `fileIds` listesiyle yapılmalı (frontend bunu bu şekilde çağırıyor) |
| `StorageService` | `storage/hotels/<hotelId>/<uuid>.<ext>` düz saklama |
| `EmailSender` / `EmailSettingsService` | SMTP ayarları **DB'de** (`EmailSettings` tablosu, admin panelinden düzenlenir — appsettings'te değil); e-posta gönderimi bu ayarları okur |
| `AuditLogService` / `AuditLogActionFilter` | Global MVC filter — `Kullanıcı`/`Yönetici` rolünün her mutating (POST/PUT/PATCH/DELETE) isteğini loglar; **Sistem Yöneticisi'nin kendi işlemleri bilinçli olarak loglanmıyor** |
| `PermissionService` / `RequirePermissionAttribute` | Dinamik rol-izin sistemi (bkz. 3.2) |

### Veri modeli (özet)
```
User              Id, Username, Email(nullable, unique index), PasswordHash, DisplayName,
                  Role(Admin=Sistem Yöneticisi|Manager=Yönetici|Staff=Kullanıcı), IsActive
RefreshToken      Id, UserId, TokenHash, ExpiresAt, RevokedAt
PasswordResetToken Id, UserId, TokenHash, ExpiresAt, UsedAt
Hotel             Id, Name, Slug, Description, IsPublished, SortOrder, LogoFileId
Folder            Id, HotelId, ParentFolderId, Name, Path(materialized), SortOrder
MediaFile         Id, HotelId, FolderId, Kind(Image|Video|Logo|Document), OriginalName,
                  StoredFileName, MimeType, SizeBytes, UploadedById
EmailSettings     Id(tek satır), SmtpHost, SmtpPort, SmtpUsername, SmtpPassword, FromAddress,
                  FromName, EnableSsl
AuditLog          Id, UserId, Action, EntityType, EntityId, Details, StatusCode, CreatedAt
RolePermission    Id, Role(Manager|Staff — Admin hiç satır almaz), PermissionKey
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

GET    /api/hotels                    public — yayında olan oteller (SortOrder'a göre)
GET    /api/hotels/admin/all          [hotels.manage]
POST/PATCH/logo                       [hotels.manage] (PATCH içindeki IsPublished değişimi ayrıca [hotels.publish] ister)
DELETE /api/hotels/:id                [hotels.delete]

GET    /api/hotels/:hotelId/browse?folderId=  public — o klasördeki alt klasör+dosyalar (lazy, tek seviye)
POST   /api/hotels/:hotelId/files     [hotels.manage] — multipart, birden çok dosya

POST/PATCH/DELETE /api/folders        [hotels.manage]
DELETE /api/files/:id                 [hotels.manage]
GET    /api/files/:id/download|/view  public — Range destekli / satır içi görüntüleme

POST/GET /api/download/zip            public — {fileIds[]} veya {folderId, includeSubfolders}

GET/POST/PATCH /api/users             [users.manage] (+ Sistem Yöneticisi hesap koruması sabit)
GET/PUT        /api/settings/email    [email_settings.manage]
GET            /api/audit-logs        [audit_logs.view]
GET/PUT        /api/role-permissions  [Authorize(Roles="admin")] — sabit, izin sistemine dahil değil
```

### Güvenlik
- JWT access (kısa ömürlü) + refresh token (rotasyonlu, hash'lenmiş DB kaydı)
- Şifreler `BCrypt.Net-Next` ile hash'lenir
- Yüklenen dosyalar hem MIME whitelist hem magic-byte imzasıyla doğrulanır
- Dosya yolları hiçbir zaman istemciden gelmez (ID → DB satırı → fiziksel yol)
- ZIP uçları dosya sayısı üst sınırıyla (`UploadLimits.MaxZipFiles`) korunur
- Rol izinleri dinamik olsa da Sistem Yöneticisi ayrıcalığı ve
  `RolePermissionsController`'ın kendi erişimi kasıtlı olarak sabit kod

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
`Host.Host`'una bakar — `"localhost"` ise Dev, `"b2b"` ise Prod, başka bir
hostname ise `IHostEnvironment.IsProduction()`'a düşer. Bu, **aynı publish
edilmiş binary'nin** hem bu makinedeki dev test sitesini hem (aynı makinede,
farklı hostname ile) prod'u simüle eden bir siteyi doğru DB'ye
bağlayarak servis edebilmesini sağlar; ASPNETCORE_ENVIRONMENT'a dokunmadan.
`PublicWebUrlProvider` aynı mantıkla şifre-sıfırlama/hoş-geldin e-postalarındaki
linklerin hangi hostname'e göre üretileceğini belirler (Dev: `http://localhost:8081`,
Prod: `http://b2b`).

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
app/admin/_layout.tsx                    Admin kabuğu: masaüstünde SOL dikey nav + LanguageSwitcher,
                                          mobilde üst yatay bar; auth guard
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

### Öne çıkan özellikler / desenler

- **Duyarlı grid** (`src/lib/useGridColumns.ts`): masaüstü 5, tablet 4, geniş
  telefon 3, telefon 2 sütun. Saf CSS yüzde tabanlı grid.
- **HotelPanel** (`src/features/hotels/HotelPanel.tsx`): masaüstünde SOL
  sidebar'da her otel için bir SATIR (küçük logo solda + otel adı sağda,
  hepsi en uzun otel adına göre ölçülmüş EŞİT genişlikte — `onLayout` ile
  ölçüp `useState`'e yazan iki-fazlı bir render deseni), mobilde yatay
  şerit (pill'ler). Seçili satır **brass** kenarlık + glow ile vurgulanır
  (mavi değil — kullanıcı özellikle "mavi dışında" istedi). Logolarda
  `BADGE_SHADOW` ile hafif "zeminde duruyor" hissi.
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
- `axios` (`src/lib/api/client.ts`).
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
- Yerel `http://b2b/b2b.api` IIS sitesi **kasıtlı olarak hep Development**
  ortamı (test amaçlı) — gerçek prod SGAPPSRV'de, oraya hiçbir zaman bu
  makineden doğrudan yazma/silme işlemi yapılmadı (kullanıcı bunu her
  seferinde kendisi yönetti/publish etti).
