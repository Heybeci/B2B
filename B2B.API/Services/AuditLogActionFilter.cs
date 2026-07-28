using Microsoft.AspNetCore.Mvc.Filters;
using B2B.API.Middleware;

namespace B2B.API.Services;

// Global MVC filter: logs every state-changing (non-GET) action performed by
// a "staff" or "manager" role so an admin can audit what non-admin accounts
// did. Admin's own actions are intentionally not logged (per product
// requirement — only Kullanıcı/Yönetici are audited, not Sistem Yöneticisi).
public class AuditLogActionFilter(AuditLogService auditLogService) : IAsyncActionFilter
{
    private static readonly string[] MutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var httpContext = context.HttpContext;
        context.ActionDescriptor.RouteValues.TryGetValue("controller", out var controllerName);
        context.ActionDescriptor.RouteValues.TryGetValue("action", out var actionName);

        var shouldLog =
            httpContext.User.Identity?.IsAuthenticated == true &&
            controllerName != "Auth" &&
            MutatingMethods.Contains(httpContext.Request.Method) &&
            httpContext.User.GetRole() is "staff" or "manager";

        var resultContext = await next();

        if (!shouldLog) return;

        var statusCode = resultContext.Exception switch
        {
            null => resultContext.HttpContext.Response.StatusCode,
            ApiException apiEx => apiEx.StatusCode,
            _ => 500,
        };

        int? entityId = null;
        var detailParts = new List<string>();
        foreach (var (name, value) in context.ActionArguments)
        {
            if (value is null) continue;
            if (!IsSimpleValue(value)) continue;
            detailParts.Add($"{name}={value}");
            entityId ??= value switch { int i => i, long l => (int)l, _ => null };
        }

        await auditLogService.LogAsync(
            userId: httpContext.User.GetUserId(),
            action: $"{controllerName}.{actionName}",
            entityType: controllerName,
            entityId: entityId,
            details: detailParts.Count > 0 ? string.Join(", ", detailParts) : null,
            statusCode: statusCode,
            ipAddress: httpContext.Connection.RemoteIpAddress?.ToString(),
            userAgent: httpContext.Request.Headers.UserAgent.ToString()
        );
    }

    private static bool IsSimpleValue(object value) =>
        value is string or int or long or bool or Guid or decimal or double or DateTime || value.GetType().IsEnum;
}
