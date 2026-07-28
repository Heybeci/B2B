using System.IO.Compression;
using Microsoft.EntityFrameworkCore;
using B2B.API.Data;
using B2B.API.Dtos;
using B2B.API.Middleware;
using B2B.API.Models;

namespace B2B.API.Services;

public record ZipEntryPlan(string AbsolutePath, string ArchivePath);

public class ZipService(AppDbContext db, StorageService storage)
{
    private static string ResolveFolderName(Folder f, string locale) =>
        locale switch
        {
            "en" => f.NameEn,
            "de" => f.NameDe,
            "ru" => f.NameRu,
            _ => null
        } is { Length: > 0 } name ? name : f.NameTr;

    private async Task<Dictionary<int, string>> FolderNamesByIdAsync(int hotelId, List<int> ids, string locale)
    {
        if (ids.Count == 0) return [];
        var folders = await db.Folders.Where(f => f.HotelId == hotelId && ids.Contains(f.Id)).ToListAsync();
        return folders.ToDictionary(f => f.Id, f => ResolveFolderName(f, locale));
    }

    private async Task<string> ArchivePathForAsync(int hotelId, int? folderId, Dictionary<int, string> namesById, int? belowFolderId)
    {
        if (folderId is null || folderId == belowFolderId) return "";
        var folder = await db.Folders.FindAsync(folderId.Value);
        if (folder is null) return "";
        var ancestorIds = folder.Path.Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Select(int.Parse)
            .Where(id => id != belowFolderId)
            .ToList();
        return string.Join('/', ancestorIds.Select(id => namesById.GetValueOrDefault(id, "klasor")));
    }

    private static string Dedupe(HashSet<string> usedNames, string dir, string name)
    {
        var candidate = name;
        var n = 1;
        while (usedNames.Contains($"{dir}/{candidate}"))
        {
            var dot = name.LastIndexOf('.');
            candidate = dot > 0 ? $"{name[..dot]} ({++n}){name[dot..]}" : $"{name} ({++n})";
        }
        usedNames.Add($"{dir}/{candidate}");
        return candidate;
    }

    public async Task<List<ZipEntryPlan>> ResolveEntriesAsync(ZipDownloadRequest input)
    {
        var usedNames = new HashSet<string>();
        var entries = new List<ZipEntryPlan>();

        if (input.FileIds is { Count: > 0 })
        {
            if (input.FileIds.Count > UploadLimits.MaxZipFiles)
            {
                throw ApiException.BadRequest($"En fazla {UploadLimits.MaxZipFiles} dosya birlikte indirilebilir");
            }
            var files = await db.Files
                .Where(f => input.FileIds.Contains(f.Id) && f.HotelId == input.HotelId && f.Kind != FileKind.Logo)
                .ToListAsync();
            if (files.Count == 0) throw ApiException.NotFound("Seçilen dosyalar bulunamadı");

            var folderIds = files.Where(f => f.FolderId != null).Select(f => f.FolderId!.Value).Distinct().ToList();
            var namesById = await FolderNamesByIdAsync(input.HotelId, folderIds, input.Locale);

            foreach (var file in files)
            {
                var dir = await ArchivePathForAsync(input.HotelId, file.FolderId, namesById, null);
                var name = Dedupe(usedNames, dir, file.OriginalName);
                entries.Add(new ZipEntryPlan(
                    storage.AbsoluteFilePath(file.HotelId, file.StoredFileName),
                    string.IsNullOrEmpty(dir) ? name : $"{dir}/{name}"
                ));
            }
            return entries;
        }

        if (input.FolderId is null)
        {
            throw ApiException.BadRequest("Dosya veya klasör belirtilmedi");
        }

        var rootFolder = await db.Folders.FindAsync(input.FolderId!.Value);
        if (rootFolder is null || rootFolder.HotelId != input.HotelId)
        {
            throw ApiException.NotFound("Klasör bulunamadı");
        }

        var folderScope = input.IncludeSubfolders
            ? await db.Folders.Where(f => f.HotelId == input.HotelId && f.Path.StartsWith(rootFolder.Path)).ToListAsync()
            : [rootFolder];
        var scopeIds = folderScope.Select(f => f.Id).ToList();
        var scopeNames = await FolderNamesByIdAsync(input.HotelId, scopeIds, input.Locale);

        var scopedFiles = await db.Files
            .Where(f => f.HotelId == input.HotelId && f.FolderId != null && scopeIds.Contains(f.FolderId.Value) && f.Kind != FileKind.Logo)
            .Take(UploadLimits.MaxZipFiles + 1)
            .ToListAsync();
        if (scopedFiles.Count == 0) throw ApiException.NotFound("Bu klasörde dosya yok");
        if (scopedFiles.Count > UploadLimits.MaxZipFiles)
        {
            throw ApiException.BadRequest($"En fazla {UploadLimits.MaxZipFiles} dosya birlikte indirilebilir");
        }

        foreach (var file in scopedFiles)
        {
            var dir = await ArchivePathForAsync(input.HotelId, file.FolderId, scopeNames, rootFolder.Id);
            var name = Dedupe(usedNames, dir, file.OriginalName);
            entries.Add(new ZipEntryPlan(
                storage.AbsoluteFilePath(file.HotelId, file.StoredFileName),
                string.IsNullOrEmpty(dir) ? name : $"{dir}/{name}"
            ));
        }
        return entries;
    }

    public static async Task WriteZipAsync(Stream output, List<ZipEntryPlan> entries)
    {
        using var archive = new ZipArchive(output, ZipArchiveMode.Create, leaveOpen: true);
        foreach (var entry in entries)
        {
            if (!System.IO.File.Exists(entry.AbsolutePath)) continue;
            var zipEntry = archive.CreateEntry(entry.ArchivePath, CompressionLevel.Optimal);
            await using var entryStream = zipEntry.Open();
            await using var fileStream = System.IO.File.OpenRead(entry.AbsolutePath);
            await fileStream.CopyToAsync(entryStream);
        }
    }
}
