CREATE TABLE [dbo].[Hotels]
(
    [Id]          INT             NOT NULL IDENTITY,
    [Name]        NVARCHAR (200)  NOT NULL,
    [Slug]        NVARCHAR (220)  NOT NULL,
    [Description] NVARCHAR (2000) NULL,
    [IsPublished] BIT             NOT NULL,
    [LogoFileId]  INT             NULL,
    [CreatedById] INT             NOT NULL,
    [SortOrder]   INT             NOT NULL DEFAULT 0,
    [CreatedAt]   DATETIME2 (7)   NOT NULL,
    [UpdatedAt]   DATETIME2 (7)   NOT NULL,
    CONSTRAINT [PK_Hotels] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_Hotels_Files_LogoFileId] FOREIGN KEY ([LogoFileId]) REFERENCES [dbo].[Files] ([Id]),
    CONSTRAINT [FK_Hotels_Users_CreatedById] FOREIGN KEY ([CreatedById]) REFERENCES [dbo].[Users] ([Id])
);
GO

CREATE INDEX [IX_Hotels_CreatedById] ON [dbo].[Hotels] ([CreatedById]);
GO

CREATE INDEX [IX_Hotels_IsPublished] ON [dbo].[Hotels] ([IsPublished]);
GO

CREATE UNIQUE INDEX [IX_Hotels_LogoFileId] ON [dbo].[Hotels] ([LogoFileId]) WHERE [LogoFileId] IS NOT NULL;
GO

CREATE UNIQUE INDEX [IX_Hotels_Slug] ON [dbo].[Hotels] ([Slug]);
