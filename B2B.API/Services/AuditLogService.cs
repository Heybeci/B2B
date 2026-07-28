using Microsoft.EntityFrameworkCore;
using B2B.API.Data;
using B2B.API.Dtos;
using B2B.API.Models;

namespace B2B.API.Services;

public class AuditLogService(AppDbContext db)
{
    private static AuditLogDto ToDto(AuditLog a) =>
        new(
            a.Id,
            a.User.Username,
            a.User.DisplayName,
            a.User.Role.ToString().ToLowerInvariant(),
            a.Action,
            a.EntityType,
            a.EntityId,
            a.Details,
            a.StatusCode,
            a.IpAddress,
            a.UserAgent,
            a.CreatedAt
        );

    // ipAddress/userAgent are truncated defensively — they come straight off
    // the HTTP connection/request headers, and a client-supplied User-Agent
    // in particular has no length guarantee, while the columns are fixed at
    // NVARCHAR(45)/NVARCHAR(500) (B2B.Database/Tables/AuditLogs.sql).
    public async Task LogAsync(
        int userId,
        string action,
        string? entityType,
        int? entityId,
        string? details,
        int statusCode,
        string? ipAddress = null,
        string? userAgent = null)
    {
        db.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            StatusCode = statusCode,
            IpAddress = Truncate(ipAddress, 45),
            UserAgent = Truncate(userAgent, 500),
        });
        await db.SaveChangesAsync();
    }

    private static string? Truncate(string? value, int maxLength) =>
        value is { Length: > 0 } && value.Length > maxLength ? value[..maxLength] : value;

    public async Task<List<AuditLogDto>> ListAsync(int page, int pageSize)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 200);

        return await db.AuditLogs
            .Include(a => a.User)
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => ToDto(a))
            .ToListAsync();
    }
}
