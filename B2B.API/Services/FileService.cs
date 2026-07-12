using Microsoft.EntityFrameworkCore;
using B2B.API.Data;
using B2B.API.Dtos;
using B2B.API.Middleware;
using B2B.API.Models;

namespace B2B.API.Services;

public class FileService(AppDbContext db, StorageService storage)
{
    private static FileDto ToDto(MediaFile f) => new(
        f.Id, f.HotelId, f.FolderId, f.Kind.ToString().ToLowerInvariant(), f.OriginalName, f.MimeType, f.SizeBytes, f.CreatedAt
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
                throw ApiException.BadRequest($"Desteklenmeyen dosya türü: {file.ContentType}");
            }

            await using (var checkStream = file.OpenReadStream())
            {
                if (!await FileTypeSniffer.MatchesDeclaredKindAsync(checkStream, file.ContentType))
                {
                    throw ApiException.BadRequest("Dosya içeriği beklenen türle eşleşmiyor");
                }
            }

            var storedFileName = StorageService.NewStoredFileName(file.FileName);
            await using (var stream = System.IO.File.Create(Path.Combine(dir, storedFileName)))
            {
                await file.CopyToAsync(stream);
            }

            var mediaFile = new MediaFile
            {
                HotelId = hotelId,
                FolderId = folderId,
                Kind = KindFromMime(file.ContentType),
                OriginalName = file.FileName,
                StoredFileName = storedFileName,
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

    public async Task<MediaFile> GetOrThrowAsync(int id) =>
        await db.Files.FindAsync(id) ?? throw ApiException.NotFound("Dosya bulunamadı");

    public async Task DeleteAsync(int id)
    {
        var file = await GetOrThrowAsync(id);
        db.Files.Remove(file);
        await db.SaveChangesAsync();
        var path = storage.AbsoluteFilePath(file.HotelId, file.StoredFileName);
        if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
    }

    public async Task DeleteManyAsync(IEnumerable<int> ids)
    {
        var files = await db.Files.Where(f => ids.Contains(f.Id)).ToListAsync();
        db.Files.RemoveRange(files);
        await db.SaveChangesAsync();

        foreach (var file in files)
        {
            var path = storage.AbsoluteFilePath(file.HotelId, file.StoredFileName);
            if (System.IO.File.Exists(path)) System.IO.File.Delete(path);
        }
    }
}
