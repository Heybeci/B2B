using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using B2B.API.Data;
using B2B.API.Dtos;
using B2B.API.Middleware;
using B2B.API.Models;

namespace B2B.API.Services;

public class FolderService(AppDbContext db, StorageService storage)
{
    private static FolderDto ToDto(Folder f) => new(f.Id, f.HotelId, f.ParentFolderId, f.NameTr, f.NameEn, f.NameDe, f.NameRu, f.Path, f.CreatedAt);

    private static BrowseFolderDto ToBrowseDto(Folder f, int photoCount) => new(
        f.Id, f.HotelId, f.ParentFolderId, f.NameTr, f.NameEn, f.NameDe, f.NameRu, f.Path, f.CreatedAt, photoCount
    );

    private static FileDto ToFileDto(MediaFile f) => new(
        f.Id, f.HotelId, f.FolderId, f.Kind.ToString().ToLowerInvariant(), f.OriginalName, f.MimeType, f.SizeBytes, f.CreatedAt,
        f.ThumbnailFileName is not null
    );

    // Used everywhere except Restore/Purge/ListTrash — those need to see
    // soft-deleted rows, so they query db.Folders.FindAsync directly instead.
    private async Task<Folder> GetFolderOrThrowAsync(int id)
    {
        var folder = await db.Folders.FindAsync(id);
        if (folder is null || folder.IsDeleted) throw ApiException.NotFound("Klasör bulunamadı");
        return folder;
    }

    private async Task<List<BreadcrumbItemDto>> BreadcrumbForAsync(string path, int hotelId)
    {
        var ids = path.Split('/', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToList();
        if (ids.Count == 0) return [];
        var folders = await db.Folders
            .Where(f => ids.Contains(f.Id) && f.HotelId == hotelId)
            .Select(f => new { f.Id, f.NameTr, f.NameEn, f.NameDe, f.NameRu })
            .ToListAsync();
        var byId = folders.ToDictionary(f => f.Id, f => new { f.NameTr, f.NameEn, f.NameDe, f.NameRu });
        return [.. ids.Where(byId.ContainsKey).Select(id => new BreadcrumbItemDto(id, byId[id].NameTr, byId[id].NameEn, byId[id].NameDe, byId[id].NameRu))];
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
            if (currentFolder.IsSystemGenerated)
            {
                // Hidden web-optimized-copy folders (see FileService) are
                // never meant to be browsed — a guessed/leaked id is treated
                // exactly like a folder that doesn't exist.
                throw ApiException.NotFound("Klasör bulunamadı");
            }
            breadcrumb = await BreadcrumbForAsync(currentFolder.Path, hotelId);
        }

        var folders = await db.Folders
            .Where(f => f.HotelId == hotelId && f.ParentFolderId == folderId && !f.IsDeleted && !f.IsSystemGenerated)
            .OrderBy(f => f.SortOrder).ThenBy(f => f.NameTr)
            .ToListAsync();

        var files = await db.Files
            .Where(f => f.HotelId == hotelId && f.FolderId == folderId && f.Kind != FileKind.Logo && !f.IsDeleted)
            .OrderBy(f => f.SortOrder).ThenByDescending(f => f.CreatedAt)
            .ToListAsync();

        // One query for the whole hotel instead of one COUNT per subfolder —
        // then match each subfolder's recursive count via Path-prefix in memory
        // (same "load rows, match by Path.StartsWith" idiom as Delete/Move/PurgeAsync).
        var photoRows = await db.Files
            .Where(f => f.HotelId == hotelId && f.Kind == FileKind.Image && !f.IsDeleted && f.FolderId != null)
            .Select(f => new { Path = f.Folder!.Path, f.Folder!.IsSystemGenerated })
            .ToListAsync();
        var visiblePhotoPaths = photoRows.Where(r => !r.IsSystemGenerated).Select(r => r.Path).ToList();

        return new BrowseResponseDto(
            new BrowseHotelDto(hotel.Id, hotel.Name, hotel.Slug),
            currentFolder is null ? null : ToDto(currentFolder),
            breadcrumb,
            [.. folders.Select(f => ToBrowseDto(f, visiblePhotoPaths.Count(p => p.StartsWith(f.Path))))],
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

        var sortOrder = await db.Folders.CountAsync(f => f.HotelId == input.HotelId && f.ParentFolderId == input.ParentFolderId);

        var folder = new Folder
        {
            HotelId = input.HotelId,
            ParentFolderId = input.ParentFolderId,
            NameTr = input.NameTr,
            NameEn = input.NameEn,
            NameDe = input.NameDe,
            NameRu = input.NameRu,
            Path = "",
            SortOrder = sortOrder,
            CreatedById = userId,
        };
        db.Folders.Add(folder);
        await db.SaveChangesAsync();

        folder.Path = $"{parentPath}{folder.Id}/";
        await db.SaveChangesAsync();
        return ToDto(folder);
    }

    public async Task<FolderDto> RenameAsync(int id, RenameFolderRequest input, int userId, bool logChange = true)
    {
        var folder = await GetFolderOrThrowAsync(id);

        if (logChange)
        {
            var previous = new FolderRenameSnapshot(folder.NameTr, folder.NameEn, folder.NameDe, folder.NameRu);
            db.EntityChangeLogs.Add(new EntityChangeLog
            {
                HotelId = folder.HotelId,
                EntityType = "Folder",
                EntityId = folder.Id,
                ChangeType = "Rename",
                PreviousValueJson = JsonSerializer.Serialize(previous),
                ChangedById = userId,
            });
        }

        folder.NameTr = input.NameTr;
        folder.NameEn = input.NameEn;
        folder.NameDe = input.NameDe;
        folder.NameRu = input.NameRu;
        folder.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return ToDto(folder);
    }

    public async Task<FolderDto> MoveAsync(int id, int? newParentFolderId, int userId, bool logChange = true)
    {
        var folder = await GetFolderOrThrowAsync(id);

        if (logChange)
        {
            var previousMove = new FolderMoveSnapshot(folder.ParentFolderId);
            db.EntityChangeLogs.Add(new EntityChangeLog
            {
                HotelId = folder.HotelId,
                EntityType = "Folder",
                EntityId = folder.Id,
                ChangeType = "Move",
                PreviousValueJson = JsonSerializer.Serialize(previousMove),
                ChangedById = userId,
            });
        }

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

        var destinationSortOrder = await db.Folders.CountAsync(f => f.HotelId == folder.HotelId && f.ParentFolderId == newParentFolderId);

        folder.ParentFolderId = newParentFolderId;
        folder.Path = newPath;
        folder.SortOrder = destinationSortOrder;
        folder.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return ToDto(folder);
    }

    public async Task ReorderAsync(int hotelId, int? parentFolderId, List<int> orderedIds)
    {
        var folders = await db.Folders
            .Where(f => f.HotelId == hotelId && f.ParentFolderId == parentFolderId)
            .ToListAsync();
        if (folders.Count != orderedIds.Count || !folders.Select(f => f.Id).ToHashSet().SetEquals(orderedIds))
        {
            throw ApiException.BadRequest("Sıralama listesi klasörlerle eşleşmiyor");
        }
        var now = DateTime.UtcNow;
        for (var i = 0; i < orderedIds.Count; i++)
        {
            var folder = folders.First(f => f.Id == orderedIds[i]);
            folder.SortOrder = i;
            folder.UpdatedAt = now;
        }
        await db.SaveChangesAsync();
    }

    // Soft delete — moves the folder + its whole subtree (and their files) to
    // the Çöp Kutusu (Trash). Filesystem is never touched here; see
    // PurgeAsync for the real hard delete.
    public async Task DeleteAsync(int id, int userId)
    {
        var target = await GetFolderOrThrowAsync(id);

        var descendants = await db.Folders
            .Where(f => f.HotelId == target.HotelId && f.Path.StartsWith(target.Path))
            .ToListAsync();

        var folderIds = descendants.Select(d => d.Id).ToList();
        var files = await db.Files.Where(f => f.FolderId != null && folderIds.Contains(f.FolderId.Value)).ToListAsync();

        var now = DateTime.UtcNow;
        foreach (var folder in descendants)
        {
            folder.IsDeleted = true;
            folder.DeletedAt = now;
            folder.DeletedById = userId;
        }
        foreach (var file in files)
        {
            file.IsDeleted = true;
            file.DeletedAt = now;
            file.DeletedById = userId;
        }
        await db.SaveChangesAsync();
    }

    // Undoes DeleteAsync: flips IsDeleted back off for the folder + every
    // currently-deleted descendant folder/file. DeletedAt/DeletedById are left
    // as historical record (not nulled out) — only IsDeleted matters for visibility.
    public async Task<FolderDto> RestoreAsync(int id, int userId)
    {
        var folder = await db.Folders.FindAsync(id) ?? throw ApiException.NotFound("Klasör bulunamadı");
        if (!folder.IsDeleted) throw ApiException.BadRequest("Klasör çöp kutusunda değil");

        var descendants = await db.Folders
            .Where(f => f.HotelId == folder.HotelId && f.Path.StartsWith(folder.Path) && f.IsDeleted)
            .ToListAsync();
        var folderIds = descendants.Select(d => d.Id).ToList();
        var files = await db.Files.Where(f => f.FolderId != null && folderIds.Contains(f.FolderId.Value) && f.IsDeleted).ToListAsync();

        foreach (var descendant in descendants)
        {
            descendant.IsDeleted = false;
        }
        foreach (var file in files)
        {
            file.IsDeleted = false;
        }
        await db.SaveChangesAsync();
        return ToDto(folder);
    }

    // Real hard delete — only allowed once a folder is already in the Trash.
    // This is the OLD (pre-soft-delete) DeleteAsync body: removes physical
    // files + thumbnails, then the DB rows deepest-first.
    public async Task PurgeAsync(int id)
    {
        var target = await db.Folders.FindAsync(id) ?? throw ApiException.NotFound("Klasör bulunamadı");
        if (!target.IsDeleted) throw ApiException.BadRequest("Önce çöp kutusuna taşınmalı");

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

    // Only top-level trashed folders — a folder whose parent is also trashed
    // is already reachable by restoring/purging that ancestor, so listing it
    // separately here would just be noise.
    public async Task<List<TrashedFolderDto>> ListTrashAsync(int hotelId)
    {
        var folders = await db.Folders
            .Include(f => f.DeletedBy)
            .Where(f => f.HotelId == hotelId && f.IsDeleted && !f.IsSystemGenerated
                && (f.ParentFolderId == null || !f.ParentFolder!.IsDeleted))
            .OrderByDescending(f => f.DeletedAt)
            .ToListAsync();

        return [.. folders.Select(f => new TrashedFolderDto(
            f.Id, f.HotelId, f.ParentFolderId, f.NameTr, f.NameEn, f.NameDe, f.NameRu,
            f.DeletedAt, f.DeletedBy?.DisplayName
        ))];
    }
}
