using System.ComponentModel.DataAnnotations;

namespace B2B.API.Dtos;

public record CreateHotelRequest(
    [Required, MaxLength(200)] string Name,
    [MaxLength(2000)] string? Description,
    bool IsPublished = true,
    int? SortOrder = null
);

public record UpdateHotelRequest(
    [MaxLength(200)] string? Name,
    [MaxLength(2000)] string? Description,
    bool? IsPublished,
    int? SortOrder
);

public record LogoFileDto(int Id, string StoredFileName, string MimeType);

public record HotelDto(
    int Id,
    string Name,
    string Slug,
    string? Description,
    bool IsPublished,
    int SortOrder,
    LogoFileDto? LogoFile
);
