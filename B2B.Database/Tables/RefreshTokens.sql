CREATE TABLE [dbo].[RefreshTokens]
(
    [Id]        INT             NOT NULL IDENTITY,
    [UserId]    INT             NOT NULL,
    [TokenHash] NVARCHAR (255)  NOT NULL,
    [ExpiresAt] DATETIME2 (7)   NOT NULL,
    [RevokedAt] DATETIME2 (7)   NULL,
    [CreatedAt] DATETIME2 (7)   NOT NULL,
    CONSTRAINT [PK_RefreshTokens] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_RefreshTokens_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_RefreshTokens_UserId] ON [dbo].[RefreshTokens] ([UserId]);
