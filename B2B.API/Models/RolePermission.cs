namespace B2B.API.Models;

// A row's existence means the given role has the given permission granted.
// Only Manager/Staff rows are ever stored — Admin is always fully permitted.
public class RolePermission
{
    public int Id { get; set; }
    public UserRole Role { get; set; }
    public string PermissionKey { get; set; } = null!;
}
