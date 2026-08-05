namespace B2B.API.Models;

public class Folder
{
    public int Id { get; set; }
    public int HotelId { get; set; }
    public int? ParentFolderId { get; set; }
    public string NameTr { get; set; } = null!;
    public string? NameEn { get; set; }
    public string? NameDe { get; set; }
    public string? NameRu { get; set; }

    // Materialized path, e.g. "/1/4/9/" — lets us find "all descendants of X"
    // with a single LIKE 'path%' query instead of a recursive walk.
    public string Path { get; set; } = "";
    public int SortOrder { get; set; }

    // True only for the hidden per-folder child that FileService creates on
    // demand to hold web-optimized image copies (see FileService's
    // GetOrCreateWebOptimizedFolderAsync). BrowseHotelAsync filters these out
    // of every listing and also refuses to browse into one directly by id —
    // this folder is never meant to be visible or navigable, only a storage
    // location for MediaFile rows that FileService.ResolveViewFileAsync
    // resolves to transparently. Never set anywhere else.
    public bool IsSystemGenerated { get; set; }

    public int CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Soft delete — see plan.md Çöp Kutusu (Trash). Never removed from disk/DB
    // by DeleteAsync anymore; only PurgeAsync does a real hard delete.
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public int? DeletedById { get; set; }

    public Hotel Hotel { get; set; } = null!;
    public Folder? ParentFolder { get; set; }
    public List<Folder> Children { get; set; } = [];
    public User CreatedBy { get; set; } = null!;
    public User? DeletedBy { get; set; }
    public List<MediaFile> Files { get; set; } = [];
}
