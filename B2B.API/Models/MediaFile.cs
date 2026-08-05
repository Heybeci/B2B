namespace B2B.API.Models;

// Named MediaFile (not File) to avoid clashing with System.IO.File.
public class MediaFile
{
    public int Id { get; set; }
    public int HotelId { get; set; }
    public int? FolderId { get; set; }
    public int SortOrder { get; set; }
    public FileKind Kind { get; set; }
    public string OriginalName { get; set; } = null!;

    // Physical storage is flat: storage/hotels/{HotelId}/{StoredFileName}.
    // The logical folder tree lives only in FolderId + Folder.Path.
    public string StoredFileName { get; set; } = null!;

    // Web-optimized thumbnail (400px-wide JPEG) generated on upload for images
    // only, stored at storage/hotels/{HotelId}/thumbs/{ThumbnailFileName}.
    // Null for non-image files and for images uploaded before this feature.
    public string? ThumbnailFileName { get; set; }

    // Points at the MediaFile row holding a larger (~1920px) JPEG copy of
    // this image, generated either automatically on upload or via the
    // "Web sürümü oluştur" folder-level backfill button (see
    // FileService.GenerateWebOptimizedForFolderAsync). Only ever set on an
    // "original" row, never on the copy it points to (no chaining). Null for
    // non-image files and for images that predate this feature/haven't been
    // backfilled yet — /files/{id}/view falls back to the original in that
    // case, exactly like ThumbnailFileName's fallback. No FK constraint,
    // same precedent as EntityChangeLog.EntityId: the copy can be purged
    // independently (see FileService's Delete/Restore/Purge/Move — they
    // mirror the operation onto the linked copy explicitly instead).
    public int? WebOptimizedFileId { get; set; }

    public string MimeType { get; set; } = null!;
    public long SizeBytes { get; set; }
    public int UploadedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Soft delete — see plan.md Çöp Kutusu (Trash). Never removed from disk/DB
    // by DeleteAsync anymore; only PurgeAsync does a real hard delete.
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public int? DeletedById { get; set; }

    public Hotel Hotel { get; set; } = null!;
    public Folder? Folder { get; set; }
    public User UploadedBy { get; set; } = null!;
    public User? DeletedBy { get; set; }
}
