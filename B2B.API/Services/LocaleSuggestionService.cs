using System.Net;
using System.Net.Http.Json;
using System.Net.Sockets;
using B2B.API.Dtos;

namespace B2B.API.Services;

// Suggests one of the app's 4 UI languages (tr/en/de/ru) from the visitor's
// IP country. Used ONLY on a first visit, before the user has explicitly
// picked/stored a language — the frontend's own default is English.
//
// The geo lookup is a SOFT dependency (free, keyless, third-party HTTP API):
// every failure mode — private/LAN IP, timeout, non-200, unparseable body,
// unmapped country — degrades to "no suggestion" (null) rather than an
// error. This endpoint must never delay or break a page load.
public class LocaleSuggestionService(
    IHttpClientFactory httpClientFactory,
    ILogger<LocaleSuggestionService> logger)
{
    private static readonly TimeSpan LookupTimeout = TimeSpan.FromSeconds(2);

    public async Task<LocaleSuggestionDto> SuggestAsync(IPAddress? remoteIp, CancellationToken cancellationToken = default)
    {
        if (!IsPublicAddress(remoteIp)) return new LocaleSuggestionDto(null);

        var countryCode = await LookupCountryCodeAsync(remoteIp!, cancellationToken);
        return new LocaleSuggestionDto(MapCountryToLocale(countryCode));
    }

    // Only these four are actual product locales; everything else (including
    // an unknown/failed lookup) means "no suggestion". Deliberately literal —
    // there is no generic country/locale table to grow here.
    private static string? MapCountryToLocale(string? countryCode) => countryCode?.ToUpperInvariant() switch
    {
        "TR" => "tr",
        "DE" or "AT" or "CH" => "de",
        "RU" => "ru",
        _ => null,
    };

    private async Task<string?> LookupCountryCodeAsync(IPAddress ip, CancellationToken cancellationToken)
    {
        try
        {
            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(LookupTimeout);

            var client = httpClientFactory.CreateClient();
            var response = await client.GetFromJsonAsync<IpApiResponse>(
                $"http://ip-api.com/json/{ip}?fields=countryCode", cts.Token);

            return response?.CountryCode;
        }
        catch (Exception ex)
        {
            // Non-fatal by design: never let a third-party outage surface as a
            // 500 through ExceptionHandlingMiddleware.
            logger.LogWarning(ex, "GeoIP locale lookup failed for {IpAddress}", ip);
            return null;
        }
    }

    // A visitor we can't geolocate meaningfully: no remote IP at all, or a
    // loopback/private/link-local address (LAN + local dev). Same client-IP
    // source as AuditLogActionFilter (Connection.RemoteIpAddress); the
    // X-Forwarded-For header is deliberately not trusted anywhere in this app
    // — the Fortigate VIP forwards WAN traffic as plain TCP with the original
    // client IP preserved.
    private static bool IsPublicAddress(IPAddress? ip)
    {
        if (ip is null) return false;

        // A dual-stack Kestrel socket reports IPv4 clients as ::ffff:a.b.c.d.
        if (ip.IsIPv4MappedToIPv6) ip = ip.MapToIPv4();

        if (IPAddress.IsLoopback(ip)) return false;

        if (ip.AddressFamily == AddressFamily.InterNetwork)
        {
            var b = ip.GetAddressBytes();
            return b[0] switch
            {
                10 => false,                                  // 10.0.0.0/8
                127 => false,                                 // 127.0.0.0/8
                169 when b[1] == 254 => false,                // 169.254.0.0/16 link-local
                172 when b[1] >= 16 && b[1] <= 31 => false,   // 172.16.0.0/12
                192 when b[1] == 168 => false,                // 192.168.0.0/16
                _ => true,
            };
        }

        if (ip.AddressFamily == AddressFamily.InterNetworkV6)
        {
            if (ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal) return false;
            // fc00::/7 unique local addresses
            if ((ip.GetAddressBytes()[0] & 0xFE) == 0xFC) return false;
            return true;
        }

        return false;
    }

    private record IpApiResponse(string? CountryCode);
}
