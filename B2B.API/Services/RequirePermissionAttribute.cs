using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace B2B.API.Services;

// Replaces [Authorize(Roles = "...")] for endpoints whose access is governed
// by the configurable role-permission system (see PermissionService). Sistem
// Yöneticisi (admin) always passes; Yönetici/Kullanıcı must have the given
// permission granted via the Rol Yetkileri screen.
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class RequirePermissionAttribute(string permission) : Attribute, IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;
        if (user.Identity?.IsAuthenticated != true)
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var permissionService = context.HttpContext.RequestServices.GetRequiredService<PermissionService>();
        if (!await permissionService.IsGrantedAsync(user.GetRole(), permission))
        {
            context.Result = new ForbidResult();
        }
    }
}
