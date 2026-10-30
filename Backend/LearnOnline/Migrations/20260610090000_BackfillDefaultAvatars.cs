using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TodoApi.Migrations
{
    public partial class BackfillDefaultAvatars : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                UPDATE ""Users""
                SET ""ProfileImageUrl"" = 'https://api.dicebear.com/9.x/thumbs/svg?seed=' || ""Id""
                WHERE ""ProfileImageUrl"" IS NULL OR ""ProfileImageUrl"" = '';
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
