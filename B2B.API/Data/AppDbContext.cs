using Microsoft.EntityFrameworkCore;
using B2B.API.Models;

namespace B2B.API.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<PasswordResetToken> PasswordResetTokens => Set<PasswordResetToken>();
    public DbSet<EmailSettings> EmailSettings => Set<EmailSettings>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<Hotel> Hotels => Set<Hotel>();
    public DbSet<Folder> Folders => Set<Folder>();
    public DbSet<MediaFile> Files => Set<MediaFile>();
    public DbSet<EntityChangeLog> EntityChangeLogs => Set<EntityChangeLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var enumConverter = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.EnumToStringConverter<UserRole>();
        var fileKindConverter = new Microsoft.EntityFrameworkCore.Storage.ValueConversion.EnumToStringConverter<FileKind>();

        modelBuilder.Entity<User>(e =>
        {
            e.Property(u => u.Username).HasMaxLength(50);
            e.Property(u => u.Email).HasMaxLength(256);
            e.Property(u => u.PasswordHash).HasMaxLength(255);
            e.Property(u => u.DisplayName).HasMaxLength(120);
            e.Property(u => u.Role).HasConversion(enumConverter).HasMaxLength(10);
            e.HasIndex(u => u.Username).IsUnique();
            e.HasIndex(u => u.Email).IsUnique();
        });

        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.Property(r => r.TokenHash).HasMaxLength(255);
            e.HasIndex(r => r.UserId);
            e.HasOne(r => r.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PasswordResetToken>(e =>
        {
            e.Property(r => r.TokenHash).HasMaxLength(255);
            e.HasIndex(r => r.UserId);
            e.HasOne(r => r.User)
                .WithMany()
                .HasForeignKey(r => r.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<EmailSettings>(e =>
        {
            e.Property(s => s.SmtpHost).HasMaxLength(255);
            e.Property(s => s.SmtpUsername).HasMaxLength(255);
            e.Property(s => s.SmtpPassword).HasMaxLength(255);
            e.Property(s => s.FromAddress).HasMaxLength(255);
            e.Property(s => s.FromName).HasMaxLength(120);
        });

        modelBuilder.Entity<AuditLog>(e =>
        {
            e.Property(a => a.Action).HasMaxLength(100);
            e.Property(a => a.EntityType).HasMaxLength(50);
            e.Property(a => a.Details).HasMaxLength(1000);
            // 45 = max textual length of an IPv6 address (incl. IPv4-mapped form).
            e.Property(a => a.IpAddress).HasMaxLength(45);
            e.Property(a => a.UserAgent).HasMaxLength(500);
            e.HasIndex(a => a.UserId);
            e.HasIndex(a => a.CreatedAt);
            e.HasOne(a => a.User)
                .WithMany()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RolePermission>(e =>
        {
            e.Property(p => p.Role).HasConversion(enumConverter).HasMaxLength(10);
            e.Property(p => p.PermissionKey).HasMaxLength(50);
            e.HasIndex(p => new { p.Role, p.PermissionKey }).IsUnique();
        });

        modelBuilder.Entity<Hotel>(e =>
        {
            e.Property(h => h.Name).HasMaxLength(200);
            e.Property(h => h.Slug).HasMaxLength(220);
            e.Property(h => h.Description).HasMaxLength(2000);
            e.HasIndex(h => h.Slug).IsUnique();
            e.HasIndex(h => h.IsPublished);

            // Restrict: users aren't deletable while they still own content
            // (deactivate instead) — avoids SQL Server's multiple-cascade-path error.
            e.HasOne(h => h.CreatedBy)
                .WithMany()
                .HasForeignKey(h => h.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);

            // Hotel <-> MediaFile (logo) is a two-way reference; keep this side
            // Restrict since the Files->Hotel side below is Cascade.
            e.HasOne(h => h.LogoFile)
                .WithOne()
                .HasForeignKey<Hotel>(h => h.LogoFileId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<Folder>(e =>
        {
            e.Property(f => f.NameTr).HasMaxLength(200);
            e.Property(f => f.NameEn).HasMaxLength(200);
            e.Property(f => f.NameDe).HasMaxLength(200);
            e.Property(f => f.NameRu).HasMaxLength(200);
            e.Property(f => f.Path).HasMaxLength(900);
            e.HasIndex(f => new { f.HotelId, f.ParentFolderId });
            e.HasIndex(f => f.Path);

            e.HasOne(f => f.Hotel)
                .WithMany(h => h.Folders)
                .HasForeignKey(f => f.HotelId)
                .OnDelete(DeleteBehavior.Cascade);

            // Self-reference: Restrict, deletion is handled explicitly in
            // FolderService (deepest-first) to keep SQL Server happy.
            e.HasOne(f => f.ParentFolder)
                .WithMany(f => f.Children)
                .HasForeignKey(f => f.ParentFolderId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(f => f.CreatedBy)
                .WithMany()
                .HasForeignKey(f => f.CreatedById)
                .OnDelete(DeleteBehavior.Restrict);

            // Trash — see plan.md Çöp Kutusu. Restrict like CreatedBy above.
            e.HasOne(f => f.DeletedBy)
                .WithMany()
                .HasForeignKey(f => f.DeletedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MediaFile>(e =>
        {
            e.Property(f => f.OriginalName).HasMaxLength(260);
            e.Property(f => f.StoredFileName).HasMaxLength(120);
            e.Property(f => f.ThumbnailFileName).HasMaxLength(120);
            e.Property(f => f.MimeType).HasMaxLength(120);
            e.Property(f => f.Kind).HasConversion(fileKindConverter).HasMaxLength(10);
            e.HasIndex(f => new { f.HotelId, f.FolderId });

            e.HasOne(f => f.Hotel)
                .WithMany(h => h.Files)
                .HasForeignKey(f => f.HotelId)
                .OnDelete(DeleteBehavior.Cascade);

            // Restrict: folder deletion removes its files explicitly in
            // FolderService first, so this never needs to cascade.
            e.HasOne(f => f.Folder)
                .WithMany(fo => fo.Files)
                .HasForeignKey(f => f.FolderId)
                .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(f => f.UploadedBy)
                .WithMany()
                .HasForeignKey(f => f.UploadedById)
                .OnDelete(DeleteBehavior.Restrict);

            // Trash — see plan.md Çöp Kutusu. Restrict like UploadedBy above.
            e.HasOne(f => f.DeletedBy)
                .WithMany()
                .HasForeignKey(f => f.DeletedById)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<EntityChangeLog>(e =>
        {
            e.Property(c => c.EntityType).HasMaxLength(20);
            e.Property(c => c.ChangeType).HasMaxLength(20);
            e.Property(c => c.PreviousValueJson).HasMaxLength(1000);
            e.HasIndex(c => new { c.HotelId, c.ChangedAt });

            e.HasOne(c => c.Hotel)
                .WithMany()
                .HasForeignKey(c => c.HotelId)
                .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(c => c.ChangedBy)
                .WithMany()
                .HasForeignKey(c => c.ChangedById)
                .OnDelete(DeleteBehavior.Restrict);
        });
    }
}
