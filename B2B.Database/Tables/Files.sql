CREATE TABLE [dbo].[Files]
(
    [Id]             INT             NOT NULL IDENTITY,
    [HotelId]        INT             NOT NULL,
    [FolderId]       INT             NULL,
    [Kind]           NVARCHAR (10)   NOT NULL,
    [OriginalName]   NVARCHAR (260)  NOT NULL,
    [StoredFileName] NVARCHAR (120)  NOT NULL,
    [ThumbnailFileName] NVARCHAR (120) NULL,
    [MimeType]       NVARCHAR (120)  NOT NULL,
    [SizeBytes]      BIGINT          NOT NULL,
    [UploadedById]   INT             NOT NULL,
    [CreatedAt]      DATETIME2 (7)   NOT NULL,
    [UpdatedAt]      DATETIME2 (7)   NOT NULL,
    CONSTRAINT [PK_Files] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Files_Users_UploadedById] FOREIGN KEY ([UploadedById]) REFERENCES [dbo].[Users] ([Id])
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
