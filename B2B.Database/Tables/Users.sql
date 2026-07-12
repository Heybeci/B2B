CREATE TABLE [dbo].[Users]
(
    [Id]           INT             NOT NULL IDENTITY,
    [Username]     NVARCHAR (50)   NOT NULL,
    [Email]        NVARCHAR (256)  NULL,
    [PasswordHash] NVARCHAR (255)  NOT NULL,
    [DisplayName]  NVARCHAR (120)  NOT NULL,
    [Role]         NVARCHAR (10)   NOT NULL,
    [IsActive]     BIT             NOT NULL,
    [CreatedAt]    DATETIME2 (7)   NOT NULL,
    [UpdatedAt]    DATETIME2 (7)   NOT NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY CLUSTERED ([Id] ASC)
);
GO

CREATE UNIQUE INDEX [IX_Users_Username] ON [dbo].[Users] ([Username]);
GO

CREATE UNIQUE INDEX [IX_Users_Email] ON [dbo].[Users] ([Email]);
GO