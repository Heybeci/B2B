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
    public int CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Hotel Hotel { get; set; } = null!;
    public Folder? ParentFolder { get; set; }
    public List<Folder> Children { get; set; } = [];
    public User CreatedBy { get; set; } = null!;
    public List<MediaFile> Files { get; set; } = [];
}
