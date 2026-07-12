namespace B2B.API.Models;

public class Hotel
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string Slug { get; set; } = null!;
    public string? Description { get; set; }
    public bool IsPublished { get; set; } = true;
    public int SortOrder { get; set; }
    public int? LogoFileId { get; set; }
    public int CreatedById { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public MediaFile? LogoFile { get; set; }
    public User CreatedBy { get; set; } = null!;
    public List<Folder> Folders { get; set; } = [];
    public List<MediaFile> Files { get; set; } = [];
}
