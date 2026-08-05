using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace B2B.API.Migrations
{
    /// <inheritdoc />
    public partial class AddWebOptimizedImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Hidden per-folder child that FileService creates on demand to
            // hold web-optimized image copies — see FileService's
            // GetOrCreateWebOptimizedFolderAsync. Filtered out of every
            // browse/trash listing (FolderService/FileService), never shown.
            migrationBuilder.AddColumn<bool>(
                name: "IsSystemGenerated",
                table: "Folders",
                type: "bit",
                nullable: false,
                defaultValue: false);

            // Self-reference to another Files row holding a ~1920px web copy
            // of this image (see FileService.ResolveViewFileAsync). No FK
            // constraint — same precedent as EntityChangeLog.EntityId: the
            // copy is purged/moved explicitly in application code (see
            // FileService's Delete/Restore/Purge/Move), never relied on for
            // referential integrity at the DB level.
            migrationBuilder.AddColumn<int>(
                name: "WebOptimizedFileId",
                table: "Files",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsSystemGenerated",
                table: "Folders");

            migrationBuilder.DropColumn(
                name: "WebOptimizedFileId",
                table: "Files");
        }
    }
}
