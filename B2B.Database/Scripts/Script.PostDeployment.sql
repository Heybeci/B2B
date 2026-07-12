/*
 Post-Deployment Script
 Runs after every publish. Seeds a default admin user when the Users table
 is empty, so a freshly deployed database always has a working login.
 Password hash below is bcrypt (work factor 12) for "1" — change it after
 first login.
*/

IF NOT EXISTS (SELECT 1 FROM [dbo].[Users])
BEGIN
    INSERT INTO [dbo].[Users] ([Username], [Email], [PasswordHash], [DisplayName], [Role], [IsActive], [CreatedAt], [UpdatedAt])
    VALUES (
        N'admin',
        N'bim@stonegroup.com',
        N'$2a$12$LPrH4Br/izg5k75VrCEYVOFQF5r.k5faTmb4oebCpqxrj/JC5BGbC',
        N'Yönetici',
        N'Admin',
        1,
        SYSUTCDATETIME(),
        SYSUTCDATETIME()
    );
END
GO

-- Placeholder single row; fill in real SMTP values from the admin panel
-- (Admin > E-posta Ayarları) after deployment.
IF NOT EXISTS (SELECT 1 FROM [dbo].[EmailSettings])
BEGIN
    INSERT INTO [dbo].[EmailSettings] ([Id], [SmtpHost], [SmtpPort], [SmtpUsername], [SmtpPassword], [FromAddress], [FromName], [EnableSsl], [UpdatedAt])
    VALUES (1, N'', 587, N'', N'', N'', N'Stone Group Media Portal', 1, SYSUTCDATETIME());
END
GO

-- Default permission grants for the configurable roles (Manager="Yönetici",
-- Staff="Kullanıcı") — matches the behavior these roles had before the
-- permission system existed. Admin is always fully permitted and has no rows.
IF NOT EXISTS (SELECT 1 FROM [dbo].[RolePermissions])
BEGIN
    INSERT INTO [dbo].[RolePermissions] ([Role], [PermissionKey]) VALUES
        (N'Manager', N'hotels.manage'),
        (N'Manager', N'hotels.publish'),
        (N'Manager', N'users.manage'),
        (N'Staff', N'hotels.manage');
END
GO
