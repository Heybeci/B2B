CREATE TABLE [dbo].[EntityChangeLogs]
(
    [Id]                INT             NOT NULL IDENTITY,
    [HotelId]           INT             NOT NULL,
    [EntityType]        NVARCHAR (20)   NOT NULL,
    [EntityId]          INT             NOT NULL,
    [ChangeType]        NVARCHAR (20)   NOT NULL,
    [PreviousValueJson] NVARCHAR (1000) NOT NULL,
    [ChangedById]       INT             NOT NULL,
    [ChangedAt]         DATETIME2 (7)   NOT NULL,
    CONSTRAINT [PK_EntityChangeLogs] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_EntityChangeLogs_Hotels_HotelId] FOREIGN KEY ([HotelId]) REFERENCES [dbo].[Hotels] ([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_EntityChangeLogs_Users_ChangedById] FOREIGN KEY ([ChangedById]) REFERENCES [dbo].[Users] ([Id])
);
GO

CREATE INDEX [IX_EntityChangeLogs_HotelId_ChangedAt] ON [dbo].[EntityChangeLogs] ([HotelId], [ChangedAt]);
GO

CREATE INDEX [IX_EntityChangeLogs_ChangedById] ON [dbo].[EntityChangeLogs] ([ChangedById]);
GO
