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
    DateTime CreatedAt,
    // True when a web-optimized thumbnail exists (images uploaded after this
    // feature). The frontend builds the URL itself as
    // `${API_URL}/files/${id}/thumbnail`; false → fall back to /download.
    bool HasThumbnail
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

public record RenameFileRequest([Required, MaxLength(260)] string OriginalName);

public record MoveFileRequest(int? FolderId);
