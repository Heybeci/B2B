using System.ComponentModel.DataAnnotations;

namespace B2B.API.Dtos;

public record CreateFolderRequest(
    [Required] int HotelId,
    int? ParentFolderId,
    [Required, MaxLength(200)] string Name
);

public record RenameFolderRequest([Required, MaxLength(200)] string Name);

public record MoveFolderRequest(int? NewParentFolderId);

public record FolderDto(int Id, int HotelId, int? ParentFolderId, string Name, string Path, DateTime CreatedAt);

public record BreadcrumbItemDto(int Id, string Name);

public record BrowseHotelDto(int Id, string Name, string Slug);

public record BrowseResponseDto(
    BrowseHotelDto Hotel,
    FolderDto? Folder,
    List<BreadcrumbItemDto> Breadcrumb,
    List<FolderDto> Folders,
    List<FileDto> Files
);
