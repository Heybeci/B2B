using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;

namespace B2B.Configuration;

public interface IConnectionStringProvider
{
    string GetConnectionString();
}

// Picks between two hardcoded connection strings (ConnectionStringValues.Dev/
// .Prod — gitignored, see ConnectionStringValues.cs.example) based on which
// hostname the request came in on: the same binary answers both
// http://localhost/b2b/b2b.api (-> Dev) and http://b2b/b2b.api (-> Prod), since
// both host headers can route to this app. Outside an HTTP
// request (e.g. the `seed` CLI command), there's no request host to read, so
// it falls back to ASPNETCORE_ENVIRONMENT instead.
public class ConnectionStringProvider(IHostEnvironment environment, IHttpContextAccessor httpContextAccessor) : IConnectionStringProvider
{
    public string GetConnectionString()
    {
        var host = httpContextAccessor.HttpContext?.Request.Host.Host;
        var isProd = host switch
        {
            "localhost" => false,
            "b2b" => true,
            _ => environment.IsProduction(),
        };

        return isProd ? ConnectionStringValues.Prod : ConnectionStringValues.Dev;
    }
}
