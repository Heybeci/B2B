using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;
using B2B.API.Data;
using B2B.API.Dtos;
using B2B.API.Middleware;
using B2B.API.Models;

namespace B2B.API.Services;

public class FileService(AppDbContext db, StorageService storage)
{
    // Web-optimized thumbnail target: 400px wide, aspect preserved, JPEG q85.
    private const int ThumbnailWidth = 400;
    private const int ThumbnailJpegQuality = 85;

    // Web-optimized VIEW copy target — bigger than the 400px browse thumbnail
    // (meant for full-screen /view, not the grid), still much lighter than a
    // full-res original (which is what made opening an image slow in the
    // first place). 1920px covers essentially every screen this portal is
    // viewed on; same JPEG q85 as the thumbnail for a consistent look.
    private const int WebOptimizedWidth = 1920;
    private const int WebOptimizedJpegQuality = 85;

    // Display name (all 4 locales) for the hidden folder GetOrCreateWebOptimizedFolderAsync
    // creates on demand — never shown anywhere today (BrowseHotelAsync filters
    // IsSystemGenerated folders out of every listing), but kept human-readable
    // in case this is ever surfaced/toggled visible later.
    private const string WebOptimizedFolderNameTr = "Web için Optimize Edilmiş Görseller";
    private const string WebOptimizedFolderNameEn = "Web-Optimized Images";
    private const string WebOptimizedFolderNameDe = "Web-optimierte Bilder";
    private const string WebOptimizedFolderNameRu = "Изображения, оптимизированные для веба";

    private static FileDto ToDto(MediaFile f) => new(
        f.Id, f.HotelId, f.FolderId, f.Kind.ToString().ToLowerInvariant(), f.OriginalName, f.MimeType, f.SizeBytes, f.CreatedAt,
        f.ThumbnailFileName is not null
    );

    private static FileKind KindFromMime(string mime)
    {
        if (UploadLimits.AllowedImageMimeTypes.Contains(mime)) return FileKind.Image;
        if (UploadLimits.AllowedVideoMimeTypes.Contains(mime)) return FileKind.Video;
        return FileKind.Document;
    }

    public async Task<List<FileDto>> SaveUploadedFilesAsync(int hotelId, int? folderId, int userId, IFormFileCollection files)
    {
        if (folderId is not null)
        {
            var folder = await db.Folders.FindAsync(folderId.Value);
            if (folder is null || folder.HotelId != hotelId)
            {
                throw ApiException.BadRequest("Klasör bu otele ait değil");
            }
        }

        var dir = storage.EnsureHotelDir(hotelId);
        var created = new List<MediaFile>();
        // Pairs an original row with its just-generated web-optimized copy (if
        // any) so WebOptimizedFileId can be wired up once both sides have real
        // ids — see the loop below and the comment right after it.
        var webOptimizedPairs = new List<(MediaFile Original, MediaFile Copy)>();
        var nextSortOrder = await db.Files.CountAsync(f => f.HotelId == hotelId && f.FolderId == folderId);

        foreach (var file in files)
        {
            if (!UploadLimits.AllAllowedMimeTypes.Contains(file.ContentType))
            {
                throw ApiException.BadRequest($"Desteklenmeyen dosya türü: {file.ContentType}", "unsupported_mime_type");
            }

            var kind = KindFromMime(file.ContentType);

            await using (var checkStream = file.OpenReadStream())
            {
                if (!await FileTypeSniffer.MatchesDeclaredKindAsync(checkStream, file.ContentType))
                {
                    throw ApiException.BadRequest("Dosya içeriği beklenen türle eşleşmiyor", "content_mismatch");
                }
            }

            var storedFileName = StorageService.NewStoredFileName(file.FileName);
            var storedPath = Path.Combine(dir, storedFileName);
            await using (var stream = System.IO.File.Create(storedPath))
            {
                await file.CopyToAsync(stream);
            }

            // Generate a web-optimized thumbnail for images. If it fails (e.g. a
            // corrupt image that still passed the magic-byte sniff), remove the
            // original we just wrote so this single-file request leaves no orphan
            // on disk, then surface a machine-readable error to the frontend.
            string? thumbnailFileName = null;
            if (kind == FileKind.Image)
            {
                try
                {
                    thumbnailFileName = await GenerateThumbnailAsync(hotelId, file);
                }
                catch
                {
                    if (System.IO.File.Exists(storedPath)) System.IO.File.Delete(storedPath);
                    throw ApiException.BadRequest("Resim küçük resmi oluşturulamadı", "thumbnail_failed");
                }
            }

            var mediaFile = new MediaFile
            {
                HotelId = hotelId,
                FolderId = folderId,
                SortOrder = nextSortOrder + created.Count,
                Kind = kind,
                OriginalName = file.FileName,
                StoredFileName = storedFileName,
                ThumbnailFileName = thumbnailFileName,
                MimeType = file.ContentType,
                SizeBytes = file.Length,
                UploadedById = userId,
            };
            db.Files.Add(mediaFile);
            created.Add(mediaFile);

            // Auto-generate a web-optimized (~1920px) copy for new image
            // uploads going forward, so every future upload avoids the exact
            // slow full-res /view path this feature exists to fix — the
            // folder-level "Web sürümü oluştur" button (see
            // GenerateWebOptimizedForFolderAsync) only exists to backfill
            // images uploaded before this existed. Best-effort: unlike the
            // thumbnail above, a failure here does NOT reject the upload —
            // it's a view-speed optimization, not upload-critical — the image
            // just falls back to full-res /view until a later backfill run.
            if (kind == FileKind.Image)
            {
                try
                {
                    var copy = await GenerateWebOptimizedCopyAsync(hotelId, folderId, storedPath, file.FileName, userId);
                    webOptimizedPairs.Add((mediaFile, copy));
                }
                catch
                {
                    // Swallowed — see comment above.
                }
            }
        }

        await db.SaveChangesAsync();

        // Both originals and their copies now have real ids (assigned by the
        // save above) — wire up the link and persist it in a second, cheap
        // save. Skipped entirely when nothing generated a copy.
        if (webOptimizedPairs.Count > 0)
        {
            foreach (var (original, copy) in webOptimizedPairs)
            {
                original.WebOptimizedFileId = copy.Id;
            }
            await db.SaveChangesAsync();
        }

        return [.. created.Select(ToDto)];
    }

    // Finds (or creates) the hidden child folder that holds web-optimized
    // copies for everything directly inside `parentFolderId`. Always a DIRECT
    // child of that folder — never a flat per-hotel bucket — so that
    // folder-level soft-delete/restore/purge (all Path-prefix based, see
    // FolderService) sweep a folder's copies up together with its originals
    // for free. FileService.MoveAsync/MoveManyAsync are what keep this
    // invariant true when an original file moves to a different folder: they
    // relocate its copy into the DESTINATION folder's hidden child too.
    private async Task<Folder> GetOrCreateWebOptimizedFolderAsync(int hotelId, int? parentFolderId, int userId)
    {
        var existing = await db.Folders.FirstOrDefaultAsync(f =>
            f.HotelId == hotelId && f.ParentFolderId == parentFolderId && f.IsSystemGenerated && !f.IsDeleted);
        if (existing is not null) return existing;

        var parentPath = "/";
        if (parentFolderId is not null)
        {
            var parent = await db.Folders.FindAsync(parentFolderId.Value);
            if (parent is not null) parentPath = parent.Path;
        }

        var siblingCount = await db.Folders.CountAsync(f => f.HotelId == hotelId && f.ParentFolderId == parentFolderId);

        var folder = new Folder
        {
            HotelId = hotelId,
            ParentFolderId = parentFolderId,
            NameTr = WebOptimizedFolderNameTr,
            NameEn = WebOptimizedFolderNameEn,
            NameDe = WebOptimizedFolderNameDe,
            NameRu = WebOptimizedFolderNameRu,
            Path = "",
            SortOrder = siblingCount,
            IsSystemGenerated = true,
            CreatedById = userId,
        };
        db.Folders.Add(folder);
        await db.SaveChangesAsync();

        folder.Path = $"{parentPath}{folder.Id}/";
        await db.SaveChangesAsync();
        return folder;
    }

    // Resizes the image at `sourcePath` down to WebOptimizedWidth (aspect
    // preserved, never upscaled — mirrors GenerateThumbnailAsync) and stores
    // it as a normal MediaFile row (flat hotel dir, like any upload) inside
    // the hidden web-optimized folder for `parentFolderId`. Caller is
    // responsible for wiring the returned row's Id into the original's
    // WebOptimizedFileId once both have been saved. Throws on a decode
    // failure — callers treat that as "skip this file" (see both call sites).
    private async Task<MediaFile> GenerateWebOptimizedCopyAsync(int hotelId, int? parentFolderId, string sourcePath, string originalFileName, int userId)
    {
        var webFolder = await GetOrCreateWebOptimizedFolderAsync(hotelId, parentFolderId, userId);
        var dir = storage.EnsureHotelDir(hotelId);
        var storedFileName = $"{Guid.NewGuid()}-web.jpg";
        var storedPath = Path.Combine(dir, storedFileName);

        using (var image = await Image.LoadAsync(sourcePath))
        {
            if (image.Width > WebOptimizedWidth)
            {
                image.Mutate(x => x.Resize(WebOptimizedWidth, 0));
            }
            await image.SaveAsync(storedPath, new JpegEncoder { Quality = WebOptimizedJpegQuality });
        }

        var siblingCount = await db.Files.CountAsync(f => f.HotelId == hotelId && f.FolderId == webFolder.Id);
        var copy = new MediaFile
        {
            HotelId = hotelId,
            FolderId = webFolder.Id,
            SortOrder = siblingCount,
            Kind = FileKind.Image,
            OriginalName = Path.ChangeExtension(originalFileName, ".jpg"),
            StoredFileName = storedFileName,
            MimeType = "image/jpeg",
            SizeBytes = new FileInfo(storedPath).Length,
            UploadedById = userId,
        };
        db.Files.Add(copy);
        return copy;
    }

    // Folder-level backfill for images uploaded before this feature existed
    // (new uploads already get this automatically, see SaveUploadedFilesAsync)
    // — powers the admin "Web sürümü oluştur" toolbar button. Only processes
    // images directly inside `folderId` (not recursive, matching this app's
    // existing lazy one-level-at-a-time browse convention) and skips anything
    // that already has a copy, so re-running the button is a cheap no-op catch-up.
    // A single corrupt/undecodable image is skipped (counted in Failed) rather
    // than aborting the whole batch.
    public async Task<GenerateWebOptimizedResultDto> GenerateWebOptimizedForFolderAsync(int hotelId, int? folderId, int userId)
    {
        if (folderId is not null)
        {
            var folder = await db.Folders.FindAsync(folderId.Value);
            if (folder is null || folder.HotelId != hotelId || folder.IsSystemGenerated)
            {
                throw ApiException.BadRequest("Klasör bu otele ait değil");
            }
        }

        var totalImages = await db.Files.CountAsync(f =>
            f.HotelId == hotelId && f.FolderId == folderId && f.Kind == FileKind.Image && !f.IsDeleted);

        var candidates = await db.Files
            .Where(f => f.HotelId == hotelId && f.FolderId == folderId && f.Kind == FileKind.Image
                && !f.IsDeleted && f.WebOptimizedFileId == null)
            .ToListAsync();

        var pairs = new List<(MediaFile Original, MediaFile Copy)>();
        var failed = 0;

        foreach (var original in candidates)
        {
            var sourcePath = storage.AbsoluteFilePath(hotelId, original.StoredFileName);
            if (!System.IO.File.Exists(sourcePath))
            {
                failed++;
                continue;
            }

            try
            {
                var copy = await GenerateWebOptimizedCopyAsync(hotelId, folderId, sourcePath, original.OriginalName, userId);
                pairs.Add((original, copy));
            }
            catch
            {
                failed++;
            }
        }

        if (pairs.Count > 0)
        {
            await db.SaveChangesAsync();
            foreach (var (original, copy) in pairs)
            {
                original.WebOptimizedFileId = copy.Id;
            }
            await db.SaveChangesAsync();
        }

        return new GenerateWebOptimizedResultDto(totalImages, pairs.Count, totalImages - candidates.Count, failed);
    }

    // Transparent /view substitution: if `file` has a linked web-optimized
    // copy that's still present (row + physical bytes), serve that instead of
    // the full-res original — this is the actual fast path the whole feature
    // exists for. /download never calls this; it always resolves the original
    // directly (see FilesController). Falls back to the original whenever the
    // copy is missing for any reason (not generated yet, purged, disk issue).
    public async Task<(string Path, string MimeType)> ResolveViewFileAsync(MediaFile file)
    {
        if (file.WebOptimizedFileId is int copyId)
        {
            var copy = await db.Files.FindAsync(copyId);
            if (copy is not null && !copy.IsDeleted)
            {
                var copyPath = storage.AbsoluteFilePath(copy.HotelId, copy.StoredFileName);
                if (System.IO.File.Exists(copyPath)) return (copyPath, copy.MimeType);
            }
        }
        return (storage.AbsoluteFilePath(file.HotelId, file.StoredFileName), file.MimeType);
    }

    // Keeps a moved original's linked web-optimized copy living inside the
    // hidden folder of its NEW parent — see GetOrCreateWebOptimizedFolderAsync
    // for why this invariant matters. No-op if the original has no copy.
    private async Task RelocateLinkedWebOptimizedCopyAsync(MediaFile original, int? destinationFolderId, int userId)
    {
        if (original.WebOptimizedFileId is not int copyId) return;
        var copy = await db.Files.FindAsync(copyId);
        if (copy is null) return;

        var destinationWebFolder = await GetOrCreateWebOptimizedFolderAsync(original.HotelId, destinationFolderId, userId);
        var siblingCount = await db.Files.CountAsync(f => f.HotelId == original.HotelId && f.FolderId == destinationWebFolder.Id);
        copy.FolderId = destinationWebFolder.Id;
        copy.SortOrder = siblingCount;
        copy.UpdatedAt = DateTime.UtcNow;
    }

    // Soft-deletes/restores an original's linked web-optimized copy alongside
    // it, so Trash counts/visibility stay consistent for admins (and so the
    // copy doesn't leak into ListTrashAsync as its own confusing entry — see
    // that method's IsSystemGenerated filter). No-op if there's no copy.
    private async Task SoftDeleteLinkedWebOptimizedCopyAsync(MediaFile original, int userId)
    {
        if (original.WebOptimizedFileId is not int copyId) return;
        var copy = await db.Files.FindAsync(copyId);
        if (copy is null || copy.IsDeleted) return;
        copy.IsDeleted = true;
        copy.DeletedAt = DateTime.UtcNow;
        copy.DeletedById = userId;
    }

    private async Task RestoreLinkedWebOptimizedCopyAsync(MediaFile original)
    {
        if (original.WebOptimizedFileId is not int copyId) return;
        var copy = await db.Files.FindAsync(copyId);
        if (copy is not null && copy.IsDeleted) copy.IsDeleted = false;
    }

    // Loads the uploaded image, downscales to ThumbnailWidth (aspect preserved,
    // never upscaled/cropped) and writes it as JPEG q85 into the hotel's thumbs/
    // dir. Returns the stored thumbnail file name.
    private async Task<string> GenerateThumbnailAsync(int hotelId, IFormFile file)
    {
        var thumbsDir = storage.EnsureThumbsDir(hotelId);
        var thumbnailFileName = StorageService.NewThumbnailFileName();
        var thumbnailPath = Path.Combine(thumbsDir, thumbnailFileName);

        await using var source = file.OpenReadStream();
        using var image = await Image.LoadAsync(source);
        if (image.Width > ThumbnailWidth)
        {
            // Passing 0 for height makes ImageSharp compute it from the aspect ratio.
            image.Mutate(x => x.Resize(ThumbnailWidth, 0));
        }
        await image.SaveAsync(thumbnailPath, new JpegEncoder { Quality = ThumbnailJpegQuality });
        return thumbnailFileName;
    }

    // Used everywhere except Restore/Purge/ListTrash — those need to see
    // soft-deleted rows, so they query db.Files.FindAsync directly instead.
    public async Task<MediaFile> GetOrThrowAsync(int id)
    {
        var file = await db.Files.FindAsync(id);
        if (file is null || file.IsDeleted) throw ApiException.NotFound("Dosya bulunamadı");
        return file;
    }

    public async Task<FileDto> RenameAsync(int id, string originalName, int userId, bool logChange = true)
    {
        var file = await GetOrThrowAsync(id);

        if (logChange)
        {
            db.EntityChangeLogs.Add(new EntityChangeLog
            {
                HotelId = file.HotelId,
                EntityType = "File",
                EntityId = file.Id,
                ChangeType = "Rename",
                PreviousValueJson = JsonSerializer.Serialize(new FileRenameSnapshot(file.OriginalName)),
                ChangedById = userId,
            });
        }

        file.OriginalName = originalName;
        file.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return ToDto(file);
    }

    public async Task<FileDto> MoveAsync(int id, int? folderId, int userId, bool logChange = true)
    {
        var file = await GetOrThrowAsync(id);

        if (folderId is not null)
        {
            var folder = await db.Folders.FindAsync(folderId.Value);
            if (folder is null || folder.HotelId != file.HotelId)
            {
                throw ApiException.BadRequest("Klasör bu otele ait değil");
            }
        }

        if (logChange)
        {
            db.EntityChangeLogs.Add(new EntityChangeLog
            {
                HotelId = file.HotelId,
                EntityType = "File",
                EntityId = file.Id,
                ChangeType = "Move",
                PreviousValueJson = JsonSerializer.Serialize(new FileMoveSnapshot(file.FolderId)),
                ChangedById = userId,
            });
        }

        var destinationSortOrder = await db.Files.CountAsync(f => f.HotelId == file.HotelId && f.FolderId == folderId);

        file.FolderId = folderId;
        file.SortOrder = destinationSortOrder;
        file.UpdatedAt = DateTime.UtcNow;
        await RelocateLinkedWebOptimizedCopyAsync(file, folderId, userId);
        await db.SaveChangesAsync();
        return ToDto(file);
    }

    public async Task<List<FileDto>> MoveManyAsync(IEnumerable<int> ids, int? folderId, int userId)
    {
        var files = await db.Files.Where(f => ids.Contains(f.Id)).ToListAsync();
        if (files.Count == 0) return [];

        if (folderId is not null)
        {
            var folder = await db.Folders.FindAsync(folderId.Value);
            if (folder is null || files.Any(f => f.HotelId != folder.HotelId))
            {
                throw ApiException.BadRequest("Klasör bu otele ait değil");
            }
        }

        var now = DateTime.UtcNow;
        foreach (var file in files)
        {
            db.EntityChangeLogs.Add(new EntityChangeLog
            {
                HotelId = file.HotelId,
                EntityType = "File",
                EntityId = file.Id,
                ChangeType = "Move",
                PreviousValueJson = JsonSerializer.Serialize(new FileMoveSnapshot(file.FolderId)),
                ChangedById = userId,
            });
        }

        var destinationSortOrder = await db.Files.CountAsync(f => f.HotelId == files[0].HotelId && f.FolderId == folderId);

        var index = 0;
        foreach (var file in files)
        {
            file.FolderId = folderId;
            file.SortOrder = destinationSortOrder + index;
            file.UpdatedAt = now;
            index++;
            await RelocateLinkedWebOptimizedCopyAsync(file, folderId, userId);
        }
        await db.SaveChangesAsync();
        return [.. files.Select(ToDto)];
    }

    public async Task ReorderAsync(int hotelId, int? folderId, List<int> orderedIds)
    {
        var files = await db.Files
            .Where(f => f.HotelId == hotelId && f.FolderId == folderId)
            .ToListAsync();
        if (files.Count != orderedIds.Count || !files.Select(f => f.Id).ToHashSet().SetEquals(orderedIds))
        {
            throw ApiException.BadRequest("Sıralama listesi dosyalarla eşleşmiyor");
        }
        var now = DateTime.UtcNow;
        for (var i = 0; i < orderedIds.Count; i++)
        {
            var file = files.First(f => f.Id == orderedIds[i]);
            file.SortOrder = i;
            file.UpdatedAt = now;
        }
        await db.SaveChangesAsync();
    }

    // Soft delete — moves the file to the Çöp Kutusu (Trash). Filesystem is
    // never touched here; see PurgeAsync for the real hard delete.
    public async Task DeleteAsync(int id, int userId)
    {
        var file = await GetOrThrowAsync(id);
        file.IsDeleted = true;
        file.DeletedAt = DateTime.UtcNow;
        file.DeletedById = userId;
        await SoftDeleteLinkedWebOptimizedCopyAsync(file, userId);
        await db.SaveChangesAsync();
    }

    public async Task DeleteManyAsync(IEnumerable<int> ids, int userId)
    {
        var files = await db.Files.Where(f => ids.Contains(f.Id)).ToListAsync();
        var now = DateTime.UtcNow;
        foreach (var file in files)
        {
            file.IsDeleted = true;
            file.DeletedAt = now;
            file.DeletedById = userId;
            await SoftDeleteLinkedWebOptimizedCopyAsync(file, userId);
        }
        await db.SaveChangesAsync();
    }

    // Undoes DeleteAsync. If the file's folder is itself trashed (deleted as
    // part of a folder-cascade delete), restoring the file alone would leave
    // it dangling in an invisible folder — so it's moved to the hotel root
    // instead, appended to the end like a fresh upload/move destination.
    public async Task<FileDto> RestoreAsync(int id, int userId)
    {
        var file = await db.Files.FindAsync(id) ?? throw ApiException.NotFound("Dosya bulunamadı");
        if (!file.IsDeleted) throw ApiException.BadRequest("Dosya çöp kutusunda değil");

        var folder = file.FolderId is not null ? await db.Folders.FindAsync(file.FolderId.Value) : null;
        if (folder is not null && folder.IsDeleted)
        {
            var destinationSortOrder = await db.Files.CountAsync(f => f.HotelId == file.HotelId && f.FolderId == null);
            file.FolderId = null;
            file.SortOrder = destinationSortOrder;
        }

        file.IsDeleted = false;
        // Not relocated here even if `folder` above was trashed — the copy
        // stays in its (still-trashed, invisible) hidden folder, which is
        // harmless because ResolveViewFileAsync looks the copy up directly by
        // id, never through folder visibility. Rare enough (restoring a
        // single file while its parent folder is still in the Trash) not to
        // be worth the extra relocation logic MoveAsync has.
        await RestoreLinkedWebOptimizedCopyAsync(file);
        await db.SaveChangesAsync();
        return ToDto(file);
    }

    // Real hard delete — only allowed once a file is already in the Trash.
    // This is the OLD (pre-soft-delete) DeleteAsync body.
    public async Task PurgeAsync(int id)
    {
        var file = await db.Files.FindAsync(id) ?? throw ApiException.NotFound("Dosya bulunamadı");
        if (!file.IsDeleted) throw ApiException.BadRequest("Önce çöp kutusuna taşınmalı");

        // The linked copy is purged unconditionally alongside the original —
        // it has no independent lifecycle of its own once the original it
        // belongs to is gone for good, regardless of whether it happened to
        // already be marked IsDeleted.
        MediaFile? copy = file.WebOptimizedFileId is int copyId ? await db.Files.FindAsync(copyId) : null;

        db.Files.Remove(file);
        if (copy is not null) db.Files.Remove(copy);
        await db.SaveChangesAsync();
        DeletePhysicalFiles(file);
        if (copy is not null) DeletePhysicalFiles(copy);
    }

    // Only top-level trashed files — a file whose folder is also trashed is
    // already reachable by restoring/purging that folder. Also excludes files
    // living in a hidden web-optimized-copy folder (see IsSystemGenerated) —
    // those are an implementation detail of another file's /view, never a
    // user-facing trash entry of their own.
    public async Task<List<TrashedFileDto>> ListTrashAsync(int hotelId)
    {
        var files = await db.Files
            .Include(f => f.DeletedBy)
            .Where(f => f.HotelId == hotelId && f.IsDeleted
                && (f.FolderId == null || !f.Folder!.IsDeleted)
                && (f.FolderId == null || !f.Folder!.IsSystemGenerated))
            .OrderByDescending(f => f.DeletedAt)
            .ToListAsync();

        return [.. files.Select(f => new TrashedFileDto(
            f.Id, f.HotelId, f.FolderId, f.OriginalName, f.Kind.ToString().ToLowerInvariant(),
            f.DeletedAt, f.DeletedBy?.DisplayName
        ))];
    }

    // Removes both the original and (if present) the generated thumbnail from disk.
    private void DeletePhysicalFiles(MediaFile file)
    {
        var path = storage.AbsoluteFilePath(file.HotelId, file.StoredFileName);
        if (System.IO.File.Exists(path)) System.IO.File.Delete(path);

        if (file.ThumbnailFileName is not null)
        {
            var thumbPath = storage.AbsoluteThumbnailPath(file.HotelId, file.ThumbnailFileName);
            if (System.IO.File.Exists(thumbPath)) System.IO.File.Delete(thumbPath);
        }
    }
}
