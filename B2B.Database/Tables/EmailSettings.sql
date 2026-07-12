-- Single-row table holding SMTP config, editable from the admin panel.
-- Always exactly one row (Id = 1), seeded by the post-deployment script.
CREATE TABLE [dbo].[EmailSettings]
(
    [Id]           INT             NOT NULL,
    [SmtpHost]     NVARCHAR (255)  NOT NULL,
    [SmtpPort]     INT             NOT NULL,
    [SmtpUsername] NVARCHAR (255)  NOT NULL,
    [SmtpPassword] NVARCHAR (255)  NOT NULL,
    [FromAddress]  NVARCHAR (255)  NOT NULL,
    [FromName]     NVARCHAR (120)  NOT NULL,
    [EnableSsl]    BIT             NOT NULL,
    [UpdatedAt]    DATETIME2 (7)   NOT NULL,
    CONSTRAINT [PK_EmailSettings] PRIMARY KEY CLUSTERED ([Id] ASC)
);
GO
