using System.Security.Claims;

namespace B2B.API.Services;

public static class ClaimsPrincipalExtensions
{
    public static int GetUserId(this ClaimsPrincipal user) =>
        int.Parse(user.FindFirstValue("sub") ?? user.FindFirstValue(ClaimTypes.NameIdentifier)!);

    public static string GetRole(this ClaimsPrincipal user) =>
        user.FindFirstValue("role") ?? user.FindFirstValue(ClaimTypes.Role) ?? "";
}
