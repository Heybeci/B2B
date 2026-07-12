using Microsoft.AspNetCore.Http.Features;
using Microsoft.AspNetCore.Mvc;
using B2B.API.Data;
using B2B.API.Dtos;
using B2B.API.Middleware;
using B2B.API.Services;

namespace B2B.API.Controllers;

[ApiController]
[Route("api/download")]
public class DownloadController(ZipService zipService, AppDbContext db) : ControllerBase
{
    private async Task<IActionResult> HandleZipAsync(ZipDownloadRequest input)
    {
        if (!(User.Identity?.IsAuthenticated ?? false))
        {
            var hotel = await db.Hotels.FindAsync(input.HotelId);
            if (hotel is null || !hotel.IsPublished) throw ApiException.NotFound("Otel bulunamadı");
        }

        var entries = await zipService.ResolveEntriesAsync(input);

        // System.IO.Compression.ZipArchive writes its central directory
        // synchronously on Dispose(), which Kestrel blocks by default on the
        // response stream. Allowing it here keeps the zip streaming straight to
        // the client (no in-memory buffering) even for large multi-video archives.
        HttpContext.Features.Get<IHttpBodyControlFeature>()!.AllowSynchronousIO = true;

        Response.ContentType = "application/zip";
        Response.Headers.ContentDisposition = $"attachment; filename=\"indirilenler-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}.zip\"";
        await ZipService.WriteZipAsync(Response.Body, entries);
        return new EmptyResult();
    }

    [HttpPost("zip")]
    public Task<IActionResult> PostZip(ZipDownloadRequest input) => HandleZipAsync(input);

    // GET variant for native clients (expo-file-system's downloader only issues GET).
    [HttpGet("zip")]
    public Task<IActionResult> GetZip(
        [FromQuery] int hotelId,
        [FromQuery] string? fileIds,
        [FromQuery] int? folderId,
        [FromQuery] bool includeSubfolders = true)
    {
        var parsedFileIds = string.IsNullOrEmpty(fileIds)
            ? null
            : fileIds.Split(',', StringSplitOptions.RemoveEmptyEntries).Select(int.Parse).ToList();
        return HandleZipAsync(new ZipDownloadRequest(hotelId, parsedFileIds, folderId, includeSubfolders));
    }
}
