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
    private async Task<(MediaFile file, string path)> ResolveAccessibleFileAsync(int id)
    {
        var file = await fileService.GetOrThrowAsync(id);

        if (!(User.Identity?.IsAuthenticated ?? false))
        {
            var hotel = await db.Hotels.FindAsync(file.HotelId);
            if (hotel is null || !hotel.IsPublished) throw ApiException.NotFound("Dosya bulunamadı");
        }

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

    [RequirePermission(Permissions.HotelsManage)]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        await fileService.DeleteAsync(id);
        return NoContent();
    }

    [RequirePermission(Permissions.HotelsManage)]
    [HttpPost("bulk-delete")]
    public async Task<IActionResult> BulkDelete(BulkDeleteFilesRequest input)
    {
        await fileService.DeleteManyAsync(input.FileIds);
        return NoContent();
    }
}
