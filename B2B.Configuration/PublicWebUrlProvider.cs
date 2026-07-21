using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;

namespace B2B.Configuration;

public interface IPublicWebUrlProvider
{
    string GetPublicWebUrl();
}

// Same hostname-based selection as ConnectionStringProvider: the same binary
// answers http://localhost:8081 (Expo dev server), http://dev.b2b/b2b.api
// (local IIS test site) and http://b2b/b2b.api (the real frontend), so links
// embedded in emails (password reset, welcome) point at whichever frontend
// matches how this request reached the API. Not a secret, so the values live
// directly here rather than in the gitignored ConnectionStringValues.cs.
public class PublicWebUrlProvider(IHostEnvironment environment, IHttpContextAccessor httpContextAccessor) : IPublicWebUrlProvider
{
    private const string ExpoDevServerUrl = "http://localhost:8081";
    private const string DevIisUrl = "http://dev.b2b";
    private const string ProdUrl = "http://b2b";

    public string GetPublicWebUrl()
    {
        var host = httpContextAccessor.HttpContext?.Request.Host.Host;
        return host switch
        {
            "localhost" => ExpoDevServerUrl,
            "dev.b2b" => DevIisUrl,
            "b2b" => ProdUrl,
            _ => environment.IsProduction() ? ProdUrl : ExpoDevServerUrl,
        };
    }
}
