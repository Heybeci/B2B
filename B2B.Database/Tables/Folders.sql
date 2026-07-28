CREATE TABLE [dbo].[Folders]
(
    [Id]             INT             NOT NULL IDENTITY,
    [HotelId]        INT             NOT NULL,
    [ParentFolderId] INT             NULL,
    [Name]         NVARCHAR (200)  NOT NULL,
    [NameTr]         NVARCHAR (200)  NULL,
    [NameEn]         NVARCHAR (200)  NULL,
    [NameDe]         NVARCHAR (200)  NULL,
    [NameRu]         NVARCHAR (200)  NULL,
    [Path]           NVARCHAR (900)  NOT NULL,
    [SortOrder]      INT             NOT NULL,
    [CreatedById]    INT             NOT NULL,
    [CreatedAt]      DATETIME2 (7)   NOT NULL,
    [UpdatedAt]      DATETIME2 (7)   NOT NULL,
    CONSTRAINT [PK_Folders] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Folders_Folders_ParentFolderId] FOREIGN KEY ([ParentFolderId]) REFERENCES [dbo].[Folders] ([Id]),
    CONSTRAINT [FK_Folders_Hotels_HotelId] FOREIGN KEY ([HotelId]) REFERENCES [dbo].[Hotels] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Folders_Users_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [dbo].[Users] ([Id])
);
GO

CREATE INDEX [IX_Folders_CreatedById] ON [dbo].[Folders] ([CreatedById]);
GO

CREATE INDEX [IX_Folders_HotelId_ParentFolderId] ON [dbo].[Folders] ([HotelId], [ParentFolderId]);
GO

CREATE INDEX [IX_Folders_ParentFolderId] ON [dbo].[Folders] ([ParentFolderId]);
GO

CREATE INDEX [IX_Folders_Path] ON [dbo].[Folders] ([Path]);
