namespace B2B.API.Models;

// Role-independent history for rename/move, distinct from AuditLog (which
// deliberately skips the Admin role — see ChangeHistoryService). Enables undo:
// UndoAsync replays PreviousValueJson through the same RenameAsync/MoveAsync
// used for the original change, which re-logs the reversal for free.
public class EntityChangeLog
{
    public int Id { get; set; }
    public int HotelId { get; set; }
    public string EntityType { get; set; } = null!; // "Folder" | "File"
    public int EntityId { get; set; } // no FK — target row may later be purged
    public string ChangeType { get; set; } = null!; // "Rename" | "Move"
    public string PreviousValueJson { get; set; } = null!;
    public int ChangedById { get; set; }
    public DateTime ChangedAt { get; set; } = DateTime.UtcNow;

    public Hotel Hotel { get; set; } = null!;
    public User ChangedBy { get; set; } = null!;
}

// Shapes of EntityChangeLog.PreviousValueJson — shared between the writer
// (FolderService/FileService, via JsonSerializer.Serialize) and the reader
// (ChangeHistoryService, via JsonSerializer.Deserialize) so the two never drift.
public record FolderRenameSnapshot(string NameTr, string? NameEn, string? NameDe, string? NameRu);
public record FolderMoveSnapshot(int? ParentFolderId);
public record FileRenameSnapshot(string OriginalName);
public record FileMoveSnapshot(int? FolderId);
