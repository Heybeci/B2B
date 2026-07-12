using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;

namespace B2B.Configuration;

public interface IPublicWebUrlProvider
{
    string GetPublicWebUrl();
}

// Same hostname-based selection as ConnectionStringProvider: the same binary
// answers both http://localhost/b2b/b2b.api (-> the local dev frontend) and
// http://b2b/b2b.api (-> the real frontend), so links embedded in emails
// (password reset, welcome) point at whichever frontend matches how this
// request reached the API. Not a secret, so the values live directly here
// rather than in the gitignored ConnectionStringValues.cs.
public class PublicWebUrlProvider(IHostEnvironment environment, IHttpContextAccessor httpContextAccessor) : IPublicWebUrlProvider
{
    private const string DevUrl = "http://localhost:8081";
    private const string ProdUrl = "http://b2b";

    public string GetPublicWebUrl()
    {
        var host = httpContextAccessor.HttpContext?.Request.Host.Host;
        var isProd = host switch
        {
            "localhost" => false,
            "b2b" => true,
            _ => environment.IsProduction(),
        };

        return isProd ? ProdUrl : DevUrl;
    }
}
