namespace B2B.API.Dtos;

public record RolePermissionsDto(string[] Manager, string[] Staff);

public record UpdateRolePermissionsRequest(string[] Manager, string[] Staff);
