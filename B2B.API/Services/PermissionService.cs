using Microsoft.EntityFrameworkCore;
using B2B.API.Data;
using B2B.API.Dtos;
using B2B.API.Models;

namespace B2B.API.Services;

public class PermissionService(AppDbContext db)
{
    // Admin (Sistem Yöneticisi) is always fully permitted and has no stored
    // rows — only Manager/Staff grants are configurable.
    public async Task<string[]> GetPermissionsForRoleAsync(string role)
    {
        if (role == "admin") return Permissions.All;
        if (!Enum.TryParse<UserRole>(role, ignoreCase: true, out var roleEnum)) return [];

        return await db.RolePermissions
            .Where(p => p.Role == roleEnum)
            .Select(p => p.PermissionKey)
            .ToArrayAsync();
    }

    public async Task<bool> IsGrantedAsync(string role, string permission) =>
        (await GetPermissionsForRoleAsync(role)).Contains(permission);

    public async Task<RolePermissionsDto> GetMatrixAsync()
    {
        var rows = await db.RolePermissions.ToListAsync();
        return new RolePermissionsDto(
            rows.Where(r => r.Role == UserRole.Manager).Select(r => r.PermissionKey).ToArray(),
            rows.Where(r => r.Role == UserRole.Staff).Select(r => r.PermissionKey).ToArray()
        );
    }

    public async Task<RolePermissionsDto> UpdateAsync(UpdateRolePermissionsRequest input)
    {
        db.RolePermissions.RemoveRange(db.RolePermissions);

        foreach (var key in input.Manager.Intersect(Permissions.All))
        {
            db.RolePermissions.Add(new RolePermission { Role = UserRole.Manager, PermissionKey = key });
        }
        foreach (var key in input.Staff.Intersect(Permissions.All))
        {
            db.RolePermissions.Add(new RolePermission { Role = UserRole.Staff, PermissionKey = key });
        }

        await db.SaveChangesAsync();
        return await GetMatrixAsync();
    }
}
