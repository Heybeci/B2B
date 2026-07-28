using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace B2B.API.Migrations
{
    /// <inheritdoc />
    public partial class AddFolderNameLocales : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Name",
                table: "Folders",
                newName: "NameTr");

            migrationBuilder.AddColumn<string>(
                name: "NameDe",
                table: "Folders",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NameEn",
                table: "Folders",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "NameRu",
                table: "Folders",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IpAddress",
                table: "AuditLogs",
                type: "nvarchar(45)",
                maxLength: 45,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "UserAgent",
                table: "AuditLogs",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NameDe",
                table: "Folders");

            migrationBuilder.DropColumn(
                name: "NameEn",
                table: "Folders");

            migrationBuilder.DropColumn(
                name: "NameRu",
                table: "Folders");

            migrationBuilder.DropColumn(
                name: "IpAddress",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "UserAgent",
                table: "AuditLogs");

            migrationBuilder.RenameColumn(
                name: "NameTr",
                table: "Folders",
                newName: "Name");
        }
    }
}
