using System.ComponentModel.DataAnnotations;

namespace B2B.API.Dtos;

public record FileDto(
    int Id,
    int HotelId,
    int? FolderId,
    string Kind,
    string OriginalName,
    string MimeType,
    long SizeBytes,
    DateTime CreatedAt
);

public record ZipDownloadRequest(
    [Required] int HotelId,
    List<int>? FileIds,
    int? FolderId,
    bool IncludeSubfolders = true
);

public record BulkDeleteFilesRequest(
    [Required] List<int> FileIds
);
