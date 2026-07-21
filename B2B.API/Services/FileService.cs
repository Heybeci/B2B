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
        }

        await db.SaveChangesAsync();
        return [.. created.Select(ToDto)];
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

    public async Task<MediaFile> GetOrThrowAsync(int id) =>
        await db.Files.FindAsync(id) ?? throw ApiException.NotFound("Dosya bulunamadı");

    public async Task<FileDto> RenameAsync(int id, string originalName)
    {
        var file = await GetOrThrowAsync(id);
        file.OriginalName = originalName;
        file.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return ToDto(file);
    }

    public async Task<FileDto> MoveAsync(int id, int? folderId)
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

        file.FolderId = folderId;
        file.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return ToDto(file);
    }

    public async Task DeleteAsync(int id)
    {
        var file = await GetOrThrowAsync(id);
        db.Files.Remove(file);
        await db.SaveChangesAsync();
        DeletePhysicalFiles(file);
    }

    public async Task DeleteManyAsync(IEnumerable<int> ids)
    {
        var files = await db.Files.Where(f => ids.Contains(f.Id)).ToListAsync();
        db.Files.RemoveRange(files);
        await db.SaveChangesAsync();

        foreach (var file in files)
        {
            DeletePhysicalFiles(file);
        }
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
