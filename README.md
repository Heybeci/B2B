# Otel Medya Portalı (SG-B2B)

Otellere ait resim/video/klasörlerin yetkili personel tarafından yüklendiği, müşterilerin
ise giriş yapmadan tek tek veya toplu (ZIP) olarak indirebildiği bir B2B medya portalı.

## Yapı

```
B2B-Web/      Expo Router (React Native + Web) — müşteri galerisi ve /admin yönetim paneli
B2B.API/      ASP.NET Core Web API (.NET 10) + EF Core (SQL Server)
```

## Gereksinimler

- Node.js 20+
- .NET SDK 10
- Bir SQL Server örneği (yerel SQLEXPRESS, Docker, veya uzak sunucu)

## Kurulum

```bash
npm install
cp B2B.API/appsettings.Development.json.example B2B.API/appsettings.Development.json
# Jwt:AccessSecret/RefreshSecret, SeedAdmin değerlerini düzenleyin
cp B2B.Configuration/ConnectionStringValues.cs.example B2B.Configuration/ConnectionStringValues.cs
# Dev/Prod connection string'lerini burada düzenleyin (appsettings'te DEĞİL — bkz. plan.md § 3.1)
cp B2B-Web/.env.example B2B-Web/.env

dotnet ef database update --project B2B.API --startup-project B2B.API
cd B2B.API && dotnet run -- seed && cd ..   # SeedAdmin ile ilk admin kullanıcıyı oluşturur
```

Yerel SQL Server Express kullanıyorsanız `Integrated Security=True` (Windows/domain kimlik
doğrulama, şifresiz) ile bağlanabilirsiniz — .NET'in `Microsoft.Data.SqlClient`'ı SSMS gibi
Shared Memory/Named Pipes üzerinden yerel bağlantı kurabildiği için ayrıca TCP/IP açmaya
gerek yoktur (bu, eski Node.js/Prisma denemesinde gerekiyordu, .NET'e geçişin sebeplerinden biri).

## Geliştirme

```bash
npm run dev:server     # dotnet run --project B2B.API  → http://localhost/b2b.api/api
npm run dev:app        # expo start --web
```

Mobilde test için `npm run dev:app` komutunu çalıştırıp Expo Go ile QR kodu okutabilir,
ya da `cd B2B-Web && npm run android` / `npm run ios` kullanabilirsiniz.

Visual Studio kullanıyorsanız kök dizindeki `B2B.API.slnx` dosyasını açın (eski `server/`
klasöründeki çözüm dosyası kaldırıldı).

## Notlar

- Yüklenen dosyalar `B2B.API/storage/hotels/<hotelId>/` altında düz (flat) olarak
  saklanır; klasör hiyerarşisi tamamen veritabanında tutulur (bkz. `B2B.API/Models/Folder.cs`,
  materialized path deseni).
- Yükleme uçları, istemcinin bildirdiği `Content-Type`'a güvenmek yerine dosya içeriğini
  magic-byte imzasıyla doğrular (`Services/FileTypeSniffer.cs`).
- ZIP toplu indirme, `System.IO.Compression.ZipArchive` ile response'a doğrudan stream edilir
  (diskte veya bellekte tam kopya oluşturulmaz); bunun için Kestrel'in senkron IO kısıtlaması
  yalnızca bu uç için `AllowSynchronousIO` ile gevşetilmiştir (`Controllers/DownloadController.cs`).
- Tekli dosya indirme, ASP.NET Core'un yerleşik `PhysicalFile(..., enableRangeProcessing: true)`
  desteğiyle HTTP Range isteklerini (video scrub/streaming) otomatik karşılar.
- `appsettings.Development.json` (gerçek sırlar içerir) git'e girmez; şablon olarak
  `appsettings.Development.json.example` kullanın.
- Admin panelinde rol bazlı **dinamik yetki sistemi** (Sistem Yöneticisi/Yönetici/Kullanıcı,
  `/admin/role-permissions`'tan yapılandırılır) ve **4 dilli arayüz** (TR/EN/DE/RU) var.
- Ayrıntılı mimari, yeni eklenen sistemlerin nasıl çalıştığı ve bilinen
  tuzaklar için **`plan.md`** dosyasına bakın — her büyük değişiklikte
  güncellenir, kod yazmadan önce okumak işi hızlandırır.
