using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace B2B.API.Migrations
{
    /// <inheritdoc />
    public partial class AddThumbnailFileName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // NOTE: The auto-generated migration also tried to add the `Email`
            // column and create AuditLogs/EmailSettings/PasswordResetTokens/
            // RolePermissions — these live ONLY in the SSDT project
            // (B2B.Database) and are intentionally NOT part of EF migration
            // history (see plan.md §1). They were stripped here so this
            // migration is a safe no-conflict delta on any existing DB where
            // SSDT already created them. Only the ThumbnailFileName column is
            // an EF-owned change.
            migrationBuilder.AddColumn<string>(
                name: "ThumbnailFileName",
                table: "Files",
                type: "nvarchar(120)",
                maxLength: 120,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ThumbnailFileName",
                table: "Files");
        }
    }
}
