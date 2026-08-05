using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using B2B.API.Data;
using B2B.API.Dtos;
using B2B.API.Middleware;
using B2B.API.Models;

namespace B2B.API.Services;

// One-directional: depends on FolderService/FileService (to replay an undo
// through their Rename/MoveAsync), but they never depend back on this — they
// write EntityChangeLog rows directly via db.EntityChangeLogs.Add(...).
public class ChangeHistoryService(AppDbContext db, FolderService folderService, FileService fileService)
{
    public async Task<List<ChangeHistoryDto>> ListAsync(int hotelId, int page, int pageSize)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var logs = await db.EntityChangeLogs
            .Include(c => c.ChangedBy)
            .Where(c => c.HotelId == hotelId)
            .OrderByDescending(c => c.ChangedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = new List<ChangeHistoryDto>(logs.Count);
        foreach (var log in logs)
        {
            result.Add(await ToDtoAsync(log));
        }
        return result;
    }

    private async Task<ChangeHistoryDto> ToDtoAsync(EntityChangeLog log)
    {
        string? currentNameTr = null, currentNameEn = null, currentNameDe = null, currentNameRu = null;
        string? currentOriginalName = null;
        string? previousNameTr = null, previousNameEn = null, previousNameDe = null, previousNameRu = null;
        int? previousParentFolderId = null;
        string? previousOriginalName = null;
        int? previousFolderId = null;

        if (log.EntityType == "Folder")
        {
            var folder = await db.Folders.FindAsync(log.EntityId);
            currentNameTr = folder?.NameTr;
            currentNameEn = folder?.NameEn;
            currentNameDe = folder?.NameDe;
            currentNameRu = folder?.NameRu;

            if (log.ChangeType == "Rename")
            {
                var snapshot = JsonSerializer.Deserialize<FolderRenameSnapshot>(log.PreviousValueJson);
                previousNameTr = snapshot?.NameTr;
                previousNameEn = snapshot?.NameEn;
                previousNameDe = snapshot?.NameDe;
                previousNameRu = snapshot?.NameRu;
            }
            else if (log.ChangeType == "Move")
            {
                var snapshot = JsonSerializer.Deserialize<FolderMoveSnapshot>(log.PreviousValueJson);
                previousParentFolderId = snapshot?.ParentFolderId;
            }
        }
        else if (log.EntityType == "File")
        {
            var file = await db.Files.FindAsync(log.EntityId);
            currentOriginalName = file?.OriginalName;

            if (log.ChangeType == "Rename")
            {
                var snapshot = JsonSerializer.Deserialize<FileRenameSnapshot>(log.PreviousValueJson);
                previousOriginalName = snapshot?.OriginalName;
            }
            else if (log.ChangeType == "Move")
            {
                var snapshot = JsonSerializer.Deserialize<FileMoveSnapshot>(log.PreviousValueJson);
                previousFolderId = snapshot?.FolderId;
            }
        }

        return new ChangeHistoryDto(
            log.Id, log.EntityType, log.EntityId, log.ChangeType, log.ChangedBy.DisplayName, log.ChangedAt,
            currentNameTr, currentNameEn, currentNameDe, currentNameRu, currentOriginalName,
            previousNameTr, previousNameEn, previousNameDe, previousNameRu, previousParentFolderId,
            previousOriginalName, previousFolderId
        );
    }

    // Replays PreviousValueJson through the same RenameAsync/MoveAsync used
    // for the original change and given userId, but with logChange:false —
    // the user wants undo to just remove the history entry, not leave a
    // paper trail of reversals, so on success we delete the original log
    // row below instead of letting Rename/MoveAsync log a new one. If the
    // target entity no longer exists (soft-deleted or purged),
    // RenameAsync/MoveAsync throws NotFound before we get there, so the
    // log row is left in place.
    public async Task<object> UndoAsync(int id, int userId)
    {
        var log = await db.EntityChangeLogs.FindAsync(id) ?? throw ApiException.NotFound("Değişiklik kaydı bulunamadı");

        object result;
        if (log.EntityType == "Folder" && log.ChangeType == "Rename")
        {
            var snapshot = JsonSerializer.Deserialize<FolderRenameSnapshot>(log.PreviousValueJson)!;
            result = await folderService.RenameAsync(log.EntityId, new RenameFolderRequest(snapshot.NameTr, snapshot.NameEn, snapshot.NameDe, snapshot.NameRu), userId, logChange: false);
        }
        else if (log.EntityType == "Folder" && log.ChangeType == "Move")
        {
            var snapshot = JsonSerializer.Deserialize<FolderMoveSnapshot>(log.PreviousValueJson)!;
            result = await folderService.MoveAsync(log.EntityId, snapshot.ParentFolderId, userId, logChange: false);
        }
        else if (log.EntityType == "File" && log.ChangeType == "Rename")
        {
            var snapshot = JsonSerializer.Deserialize<FileRenameSnapshot>(log.PreviousValueJson)!;
            result = await fileService.RenameAsync(log.EntityId, snapshot.OriginalName, userId, logChange: false);
        }
        else if (log.EntityType == "File" && log.ChangeType == "Move")
        {
            var snapshot = JsonSerializer.Deserialize<FileMoveSnapshot>(log.PreviousValueJson)!;
            result = await fileService.MoveAsync(log.EntityId, snapshot.FolderId, userId, logChange: false);
        }
        else
        {
            throw ApiException.BadRequest("Bilinmeyen değişiklik türü");
        }

        db.EntityChangeLogs.Remove(log);
        await db.SaveChangesAsync();
        return result;
    }
}
