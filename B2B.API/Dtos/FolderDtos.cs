using System.ComponentModel.DataAnnotations;

namespace B2B.API.Dtos;

public record CreateFolderRequest(
    [Required] int HotelId,
    int? ParentFolderId,
    [Required, MaxLength(200)] string NameTr,
    [MaxLength(200)] string? NameEn,
    [MaxLength(200)] string? NameDe,
    [MaxLength(200)] string? NameRu
);

public record RenameFolderRequest(
    [Required, MaxLength(200)] string NameTr,
    [MaxLength(200)] string? NameEn,
    [MaxLength(200)] string? NameDe,
    [MaxLength(200)] string? NameRu
);

public record MoveFolderRequest(int? NewParentFolderId);

public record FolderDto(
    int Id,
    int HotelId,
    int? ParentFolderId,
    string NameTr,
    string? NameEn,
    string? NameDe,
    string? NameRu,
    string Path,
    DateTime CreatedAt
);

public record BreadcrumbItemDto(
    int Id,
    string NameTr,
    string? NameEn,
    string? NameDe,
    string? NameRu
);

public record BrowseHotelDto(int Id, string Name, string Slug);

public record BrowseResponseDto(
    BrowseHotelDto Hotel,
    FolderDto? Folder,
    List<BreadcrumbItemDto> Breadcrumb,
    List<FolderDto> Folders,
    List<FileDto> Files
);
