CREATE TABLE [dbo].[AuditLogs]
(
    [Id]         INT             NOT NULL IDENTITY,
    [UserId]     INT             NOT NULL,
    [Action]     NVARCHAR (100)  NOT NULL,
    [EntityType] NVARCHAR (50)   NULL,
    [EntityId]   INT             NULL,
    [Details]    NVARCHAR (1000) NULL,
    [StatusCode] INT             NOT NULL,
    [CreatedAt]  DATETIME2 (7)   NOT NULL,
    CONSTRAINT [PK_AuditLogs] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_AuditLogs_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_AuditLogs_UserId] ON [dbo].[AuditLogs] ([UserId]);
GO

CREATE INDEX [IX_AuditLogs_CreatedAt] ON [dbo].[AuditLogs] ([CreatedAt]);
GO