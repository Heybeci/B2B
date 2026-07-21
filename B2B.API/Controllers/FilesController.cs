using Microsoft.AspNetCore.Mvc;
using B2B.API.Data;
using B2B.API.Dtos;
using B2B.API.Middleware;
using B2B.API.Models;
using B2B.API.Services;

namespace B2B.API.Controllers;

[ApiController]
[Route("api/files")]
public class FilesController(FileService fileService, StorageService storage, AppDbContext db) : ControllerBase
{
    // Enforces the public-access rule (anonymous callers only reach files of
    // published hotels); authenticated admins/staff see everything.
    private async Task<MediaFile> ResolveAuthorizedFileAsync(int id)
    {
        var file = await fileService.GetOrThrowAsync(id);

        if (!(User.Identity?.IsAuthenticated ?? false))
        {
            var hotel = await db.Hotels.FindAsync(file.HotelId);
            if (hotel is null || !hotel.IsPublished) throw ApiException.NotFound("Dosya bulunamadı");
        }

        return file;
    }

    private async Task<(MediaFile file, string path)> ResolveAccessibleFileAsync(int id)
    {
        var file = await ResolveAuthorizedFileAsync(id);
        var path = storage.AbsoluteFilePath(file.HotelId, file.StoredFileName);
        if (!System.IO.File.Exists(path)) throw ApiException.NotFound("Dosya sunucuda bulunamadı");
        return (file, path);
    }

    // ASP.NET Core's PhysicalFile result natively handles Range requests
    // (206 Partial Content, Content-Range) when enableRangeProcessing is set —
    // no manual byte-offset parsing needed, unlike the Node implementation.
    [HttpGet("{id:int}/download")]
    public async Task<IActionResult> Download(int id)
    {
        var (file, path) = await ResolveAccessibleFileAsync(id);
        // Passing fileDownloadName sets Content-Disposition: attachment, forcing a save-to-disk.
        return PhysicalFile(path, file.MimeType, file.OriginalName, enableRangeProcessing: true);
    }

    // Same file, but without Content-Disposition: attachment — browsers render
    // images/video/PDF inline instead of forcing a download, for the "view" action.
    [HttpGet("{id:int}/view")]
    public async Task<IActionResult> View(int id)
    {
        var (file, path) = await ResolveAccessibleFileAsync(id);
        return PhysicalFile(path, file.MimeType, enableRangeProcessing: true);
    }

    // Web-optimized 400px JPEG thumbnail for image files. 404 when the file has
    // no thumbnail (non-image, or an image uploaded before the feature) — the
    // frontend falls back to /download in that case. Long cache: a thumbnail's
    // bytes never change for a given file id (a re-upload gets a new id).
    [HttpGet("{id:int}/thumbnail")]
    public async Task<IActionResult> Thumbnail(int id)
    {
        var file = await ResolveAuthorizedFileAsync(id);
        if (file.ThumbnailFileName is null) throw ApiException.NotFound("Küçük resim bulunamadı");

        var path = storage.AbsoluteThumbnailPath(file.HotelId, file.ThumbnailFileName);
        if (!System.IO.File.Exists(path)) throw ApiException.NotFound("Küçük resim sunucuda bulunamadı");

        Response.Headers.CacheControl = "public, max-age=31536000, immutable";
        return PhysicalFile(path, "image/jpeg", enableRangeProcessing: true);
    }

    [RequirePermission(Permissions.HotelsManage)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await fileService.DeleteAsync(id);
        return NoContent();
    }

    [RequirePermission(Permissions.HotelsManage)]
    [HttpPatch("{id:int}")]
    public Task<FileDto> Rename(int id, RenameFileRequest input) => fileService.RenameAsync(id, input.OriginalName);

    [RequirePermission(Permissions.HotelsManage)]
    [HttpPatch("{id:int}/move")]
    public Task<FileDto> Move(int id, MoveFileRequest input) => fileService.MoveAsync(id, input.FolderId);

    [RequirePermission(Permissions.HotelsManage)]
    [HttpPost("bulk-delete")]
    public async Task<IActionResult> BulkDelete(BulkDeleteFilesRequest input)
    {
        await fileService.DeleteManyAsync(input.FileIds);
        return NoContent();
    }
}
