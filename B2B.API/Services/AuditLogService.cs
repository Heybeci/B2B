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
            a.CreatedAt
        );

    public async Task LogAsync(int userId, string action, string? entityType, int? entityId, string? details, int statusCode)
    {
        db.AuditLogs.Add(new AuditLog
        {
            UserId = userId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            Details = details,
            StatusCode = statusCode,
        });
        await db.SaveChangesAsync();
    }

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
