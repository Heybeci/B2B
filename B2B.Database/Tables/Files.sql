CREATE TABLE [dbo].[Files]
(
    [Id]             INT             NOT NULL IDENTITY,
    [HotelId]        INT             NOT NULL,
    [FolderId]       INT             NULL,
    [Kind]           NVARCHAR (10)   NOT NULL,
    [OriginalName]   NVARCHAR (260)  NOT NULL,
    [StoredFileName] NVARCHAR (120)  NOT NULL,
    [ThumbnailFileName] NVARCHAR (120) NULL,
    [SortOrder]   INT             NOT NULL DEFAULT 0,
    [MimeType]       NVARCHAR (120)  NOT NULL,
    [SizeBytes]      BIGINT          NOT NULL,
    [UploadedById]   INT             NOT NULL,
    [CreatedAt]      DATETIME2 (7)   NOT NULL,
    [UpdatedAt]      DATETIME2 (7)   NOT NULL,
    [IsDeleted]      BIT             NOT NULL DEFAULT 0,
    [DeletedAt]      DATETIME2 (7)   NULL,
    [DeletedById]    INT             NULL,
    -- Self-reference to another Files row holding a ~1920px web-optimized
    -- copy of this image (see FileService.ResolveViewFileAsync). No FK
    -- constraint by design — same precedent as EntityChangeLogs.EntityId,
    -- see FileService's Delete/Restore/Purge/Move for how the link is kept
    -- consistent in application code instead.
    [WebOptimizedFileId] INT         NULL,
    CONSTRAINT [PK_Files] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Files_Users_UploadedById] FOREIGN KEY ([UploadedById]) REFERENCES [dbo].[Users] ([Id]),
    CONSTRAINT [FK_Files_Users_DeletedById] FOREIGN KEY ([DeletedById]) REFERENCES [dbo].[Users] ([Id])
);
GO

-- HotelId/FolderId FKs are added in ForeignKeys.sql: Hotels and Files
-- reference each other (Hotels.LogoFileId -> Files, Files.HotelId -> Hotels),
-- so one side must be deferred to break the circular table dependency.

CREATE INDEX [IX_Files_FolderId] ON [dbo].[Files] ([FolderId]);
GO

CREATE INDEX [IX_Files_HotelId_FolderId] ON [dbo].[Files] ([HotelId], [FolderId]);
GO

CREATE INDEX [IX_Files_UploadedById] ON [dbo].[Files] ([UploadedById]);
