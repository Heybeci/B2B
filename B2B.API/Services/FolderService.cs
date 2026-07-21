using Microsoft.EntityFrameworkCore;
using B2B.API.Data;
using B2B.API.Dtos;
using B2B.API.Middleware;
using B2B.API.Models;

namespace B2B.API.Services;

public class FolderService(AppDbContext db, StorageService storage)
{
    private static FolderDto ToDto(Folder f) => new(f.Id, f.HotelId, f.ParentFolderId, f.Name, f.Path, f.CreatedAt);

    private static FileDto ToFileDto(MediaFile f) => new(
        f.Id, f.HotelId, f.FolderId, f.Kind.ToString().ToLowerInvariant(), f.OriginalName, f.MimeType, f.SizeBytes, f.CreatedAt,
        f.ThumbnailFileName is not null
    );

    private async Task<Folder> GetFolderOrThrowAsync(int id) =>
        await db.Folders.FindAsync(id) ?? throw ApiException.NotFound("Klasör bulunamadı");

    private async Task<List<BreadcrumbItemDto>> BreadcrumbForAsync(string path, int hotelId)
    {
        var ids = path.Split('/', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToList();
        if (ids.Count == 0) return [];
        var folders = await db.Folders
            .Where(f => ids.Contains(f.Id) && f.HotelId == hotelId)
            .Select(f => new { f.Id, f.Name })
            .ToListAsync();
        var byId = folders.ToDictionary(f => f.Id, f => f.Name);
        return [.. ids.Where(byId.ContainsKey).Select(id => new BreadcrumbItemDto(id, byId[id]))];
    }

    public async Task<BrowseResponseDto> BrowseHotelAsync(int hotelId, int? folderId, bool includeUnpublished = false)
    {
        var hotel = await db.Hotels.FindAsync(hotelId);
        if (hotel is null || (!includeUnpublished && !hotel.IsPublished))
        {
            throw ApiException.NotFound("Otel bulunamadı");
        }

        Folder? currentFolder = null;
        List<BreadcrumbItemDto> breadcrumb = [];
        if (folderId is not null)
        {
            currentFolder = await GetFolderOrThrowAsync(folderId.Value);
            if (currentFolder.HotelId != hotelId)
            {
                throw ApiException.BadRequest("Klasör bu otele ait değil");
            }
            breadcrumb = await BreadcrumbForAsync(currentFolder.Path, hotelId);
        }

        var folders = await db.Folders
            .Where(f => f.HotelId == hotelId && f.ParentFolderId == folderId)
            .OrderBy(f => f.SortOrder).ThenBy(f => f.Name)
            .ToListAsync();

        var files = await db.Files
            .Where(f => f.HotelId == hotelId && f.FolderId == folderId && f.Kind != FileKind.Logo)
            .OrderByDescending(f => f.CreatedAt)
            .ToListAsync();

        return new BrowseResponseDto(
            new BrowseHotelDto(hotel.Id, hotel.Name, hotel.Slug),
            currentFolder is null ? null : ToDto(currentFolder),
            breadcrumb,
            [.. folders.Select(ToDto)],
            [.. files.Select(ToFileDto)]
        );
    }

    public async Task<FolderDto> CreateAsync(CreateFolderRequest input, int userId)
    {
        var hotel = await db.Hotels.FindAsync(input.HotelId) ?? throw ApiException.NotFound("Otel bulunamadı");

        var parentPath = "/";
        if (input.ParentFolderId is not null)
        {
            var parent = await GetFolderOrThrowAsync(input.ParentFolderId.Value);
            if (parent.HotelId != input.HotelId)
            {
                throw ApiException.BadRequest("Üst klasör bu otele ait değil");
            }
            parentPath = parent.Path;
        }

        var folder = new Folder
        {
            HotelId = input.HotelId,
            ParentFolderId = input.ParentFolderId,
            Name = input.Name,
            Path = "",
            CreatedById = userId,
        };
        db.Folders.Add(folder);
        await db.SaveChangesAsync();

        folder.Path = $"{parentPath}{folder.Id}/";
        await db.SaveChangesAsync();
        return ToDto(folder);
    }

    public async Task<FolderDto> RenameAsync(int id, string name)
    {
        var folder = await GetFolderOrThrowAsync(id);
        folder.Name = name;
        folder.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return ToDto(folder);
    }

    public async Task<FolderDto> MoveAsync(int id, int? newParentFolderId)
    {
        var folder = await GetFolderOrThrowAsync(id);

        var newParentPath = "/";
        if (newParentFolderId is not null)
        {
            var parent = await GetFolderOrThrowAsync(newParentFolderId.Value);
            if (parent.HotelId != folder.HotelId)
            {
                throw ApiException.BadRequest("Üst klasör bu otele ait değil");
            }
            if (newParentFolderId == id || parent.Path.StartsWith(folder.Path))
            {
                throw ApiException.BadRequest("Klasör kendi alt klasörüne taşınamaz");
            }
            newParentPath = parent.Path;
        }

        var newPath = $"{newParentPath}{folder.Id}/";

        var descendants = await db.Folders
            .Where(f => f.HotelId == folder.HotelId && f.Path.StartsWith(folder.Path) && f.Id != folder.Id)
            .ToListAsync();
        foreach (var descendant in descendants)
        {
            descendant.Path = newPath + descendant.Path[folder.Path.Length..];
        }

        folder.ParentFolderId = newParentFolderId;
        folder.Path = newPath;
        folder.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return ToDto(folder);
    }

    public async Task DeleteAsync(int id)
    {
        var target = await GetFolderOrThrowAsync(id);

        var descendants = await db.Folders
            .Where(f => f.HotelId == target.HotelId && f.Path.StartsWith(target.Path))
            .ToListAsync();
        // Deepest first so we never violate the (Restrict) parentFolder FK while deleting.
        descendants.Sort((a, b) => b.Path.Length.CompareTo(a.Path.Length));

        var folderIds = descendants.Select(d => d.Id).ToList();
        var files = await db.Files.Where(f => f.FolderId != null && folderIds.Contains(f.FolderId.Value)).ToListAsync();

        db.Files.RemoveRange(files);
        await db.SaveChangesAsync();
        foreach (var file in files)
        {
            var path = storage.AbsoluteFilePath(file.HotelId, file.StoredFileName);
            if (System.IO.File.Exists(path)) System.IO.File.Delete(path);

            if (file.ThumbnailFileName is not null)
            {
                var thumbPath = storage.AbsoluteThumbnailPath(file.HotelId, file.ThumbnailFileName);
                if (System.IO.File.Exists(thumbPath)) System.IO.File.Delete(thumbPath);
            }
        }

        foreach (var folder in descendants)
        {
            db.Folders.Remove(folder);
            await db.SaveChangesAsync();
        }
    }
}
