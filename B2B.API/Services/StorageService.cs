using Microsoft.Extensions.Options;

namespace B2B.API.Services;

public class StorageOptions
{
    public string Root { get; set; } = "./storage";
}

// Every uploaded file lives at storage/hotels/{hotelId}/{storedFileName}, flat —
// the logical folder tree is DB-only. No request ever supplies a filesystem
// path, so path traversal is structurally impossible here.
public class StorageService(IOptions<StorageOptions> options)
{
    private readonly string _root = Path.GetFullPath(options.Value.Root);

    public string HotelDir(int hotelId) => Path.Combine(_root, "hotels", hotelId.ToString());

    public string EnsureHotelDir(int hotelId)
    {
        var dir = HotelDir(hotelId);
        Directory.CreateDirectory(dir);
        return dir;
    }

    public string AbsoluteFilePath(int hotelId, string storedFileName) => Path.Combine(HotelDir(hotelId), storedFileName);

    public static string NewStoredFileName(string originalName)
    {
        var ext = Path.GetExtension(originalName).ToLowerInvariant();
        return $"{Guid.NewGuid()}{ext}";
    }

    public void DeleteHotelDir(int hotelId)
    {
        var dir = HotelDir(hotelId);
        if (Directory.Exists(dir))
        {
            Directory.Delete(dir, recursive: true);
        }
    }
}
