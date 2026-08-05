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
    bool IncludeSubfolders = true,
    [MaxLength(2)] string Locale = "tr"  // "tr", "en", "de", "ru"
);

public record BulkDeleteFilesRequest(
    [Required] List<int> FileIds
);

public record BulkMoveFilesRequest(
    [Required] List<int> FileIds,
    int? FolderId
);

public record RenameFileRequest([Required, MaxLength(260)] string OriginalName);

public record MoveFileRequest(int? FolderId);

public record ReorderFilesRequest([Required] int HotelId, int? FolderId, [Required] List<int> OrderedIds);

public record GenerateWebOptimizedRequest([Required] int HotelId, int? FolderId);

// TotalImages: images directly in the folder (before this run). Processed:
// newly generated this run. AlreadyOptimized: had a copy before this run
// started (subset of TotalImages, disjoint from Processed). Failed: could not
// be decoded/resized and were skipped.
public record GenerateWebOptimizedResultDto(int TotalImages, int Processed, int AlreadyOptimized, int Failed);
