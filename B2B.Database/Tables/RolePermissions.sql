-- A row's existence grants the given permission to the given role.
-- Only Manager/Staff rows are ever stored — Admin is always fully permitted
-- (enforced in code, not represented here).
CREATE TABLE [dbo].[RolePermissions]
(
    [Id]            INT             NOT NULL IDENTITY,
    [Role]          NVARCHAR (10)   NOT NULL,
    [PermissionKey] NVARCHAR (50)   NOT NULL,
    CONSTRAINT [PK_RolePermissions] PRIMARY KEY CLUSTERED ([Id] ASC)
);
GO

CREATE UNIQUE INDEX [IX_RolePermissions_Role_PermissionKey] ON [dbo].[RolePermissions] ([Role], [PermissionKey]);
