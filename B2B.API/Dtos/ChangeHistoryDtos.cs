namespace B2B.API.Dtos;

// Backend is locale-agnostic (see plan.md §5.1) — no formatted message here,
// just raw previous/current fields. The frontend picks the right locale and
// builds the sentence itself, same as it does for folder names elsewhere.
public record ChangeHistoryDto(
    int Id,
    string EntityType, // "Folder" | "File"
    int EntityId,
    string ChangeType, // "Rename" | "Move"
    string ChangedByDisplayName,
    DateTime ChangedAt,

    // Current state, best-effort — null when the entity was later purged.
    string? CurrentNameTr,
    string? CurrentNameEn,
    string? CurrentNameDe,
    string? CurrentNameRu,
    string? CurrentOriginalName,

    // Previous value — only the fields relevant to EntityType+ChangeType are populated.
    string? PreviousNameTr,
    string? PreviousNameEn,
    string? PreviousNameDe,
    string? PreviousNameRu,
    int? PreviousParentFolderId,
    string? PreviousOriginalName,
    int? PreviousFolderId
);
