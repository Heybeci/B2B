namespace B2B.API.Models;

// Named MediaFile (not File) to avoid clashing with System.IO.File.
public class MediaFile
{
    public int Id { get; set; }
    public int HotelId { get; set; }
    public int? FolderId { get; set; }
    public FileKind Kind { get; set; }
    public string OriginalName { get; set; } = null!;

    // Physical storage is flat: storage/hotels/{HotelId}/{StoredFileName}.
    // The logical folder tree lives only in FolderId + Folder.Path.
    public string StoredFileName { get; set; } = null!;
    public string MimeType { get; set; } = null!;
    public long SizeBytes { get; set; }
    public int UploadedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Hotel Hotel { get; set; } = null!;
    public Folder? Folder { get; set; }
    public User UploadedBy { get; set; } = null!;
}
