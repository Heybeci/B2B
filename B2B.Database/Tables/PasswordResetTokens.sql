CREATE TABLE [dbo].[PasswordResetTokens]
(
    [Id]        INT             NOT NULL IDENTITY,
    [UserId]    INT             NOT NULL,
    [TokenHash] NVARCHAR (255)  NOT NULL,
    [ExpiresAt] DATETIME2 (7)   NOT NULL,
    [UsedAt]    DATETIME2 (7)   NULL,
    [CreatedAt] DATETIME2 (7)   NOT NULL,
    CONSTRAINT [PK_PasswordResetTokens] PRIMARY KEY CLUSTERED ([Id] ASC),
    CONSTRAINT [FK_PasswordResetTokens_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [dbo].[Users] ([Id]) ON DELETE CASCADE
);
GO

CREATE INDEX [IX_PasswordResetTokens_UserId] ON [dbo].[PasswordResetTokens] ([UserId]);
