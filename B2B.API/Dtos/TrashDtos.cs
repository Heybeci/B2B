namespace B2B.API.Dtos;

public record TrashedFolderDto(
    int Id,
    int HotelId,
    int? ParentFolderId,
    string NameTr,
    string? NameEn,
    string? NameDe,
    string? NameRu,
    DateTime? DeletedAt,
    string? DeletedByDisplayName
);

public record TrashedFileDto(
    int Id,
    int HotelId,
    int? FolderId,
    string OriginalName,
    string Kind,
    DateTime? DeletedAt,
    string? DeletedByDisplayName
);

public record TrashListDto(List<TrashedFolderDto> Folders, List<TrashedFileDto> Files);
