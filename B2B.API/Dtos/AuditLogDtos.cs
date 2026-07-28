namespace B2B.API.Dtos;

public record AuditLogDto(
    int Id,
    string Username,
    string DisplayName,
    string Role,
    string Action,
    string? EntityType,
    int? EntityId,
    string? Details,
    int StatusCode,
    string? IpAddress,
    string? UserAgent,
    DateTime CreatedAt
);
