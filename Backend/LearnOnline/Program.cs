using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using LearnOnline.Data;

var builder = WebApplication.CreateBuilder(args);

// Register MVC controllers so ASP.NET can discover our API endpoints
// Enums are serialized as strings so the React app can send readable role values
builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// Allow the React frontend (Vite dev server and packaged Electron app) to call our API
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
        policy.WithOrigins(
                  "http://localhost:5200",
                  "http://localhost:5201",
                  "http://127.0.0.1:5200",
                  "http://127.0.0.1:5201")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// Swagger / OpenAPI for interactive API docs at /swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddOpenApi();

// Register HttpClient so controllers can call external services like Google token validation
builder.Services.AddHttpClient();

// Register the EF Core database context with the PostgreSQL connection string
// PendingModelChangesWarning is suppressed because migrations in this project use raw SQL
// and intentionally don't update the EF snapshot.
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("LearnOnlineDb"))
           .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

var app = builder.Build();

// ----- Ensure migration history and apply pending migrations -----
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var conn = context.Database.GetDbConnection();
    conn.Open();
    using (var cmd = conn.CreateCommand())
    {
        // Mark the two original migrations as applied if they aren't yet
        // (the tables already exist from a prior deployment without EF history)
        cmd.CommandText = @"
            CREATE TABLE IF NOT EXISTS ""__EFMigrationsHistory"" (
                ""MigrationId"" character varying(150) NOT NULL,
                ""ProductVersion"" character varying(32) NOT NULL,
                CONSTRAINT ""PK___EFMigrationsHistory"" PRIMARY KEY (""MigrationId"")
            );
            INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
            VALUES ('20260324193947_InitLearnOnline', '9.0.3')
            ON CONFLICT DO NOTHING;
            INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
            VALUES ('20260422151017_AddNoteTitle', '9.0.3')
            ON CONFLICT DO NOTHING;
            ALTER TABLE ""Assignments"" ADD COLUMN IF NOT EXISTS ""AllowMultipleAttempts"" boolean NOT NULL DEFAULT FALSE;
            ALTER TABLE ""Assignments"" ADD COLUMN IF NOT EXISTS ""IsClosed"" boolean NOT NULL DEFAULT FALSE;
            ALTER TABLE ""Assignments"" ADD COLUMN IF NOT EXISTS ""QuizQuestionsJson"" text NULL;
            ALTER TABLE ""Assignments"" ADD COLUMN IF NOT EXISTS ""Type"" text NOT NULL DEFAULT 'online';
            INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
            VALUES ('20260525083558_AddAssignmentTypeAndClose', '9.0.3')
            ON CONFLICT DO NOTHING;
            ALTER TABLE ""Assignments"" ADD COLUMN IF NOT EXISTS ""OpenDate"" timestamp with time zone NULL;
            ALTER TABLE ""Assignments"" ADD COLUMN IF NOT EXISTS ""CloseDate"" timestamp with time zone NULL;
            INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
            VALUES ('20260525120000_AddAssignmentOpenCloseDate', '9.0.3')
            ON CONFLICT DO NOTHING;
            ALTER TABLE ""Courses"" ADD COLUMN IF NOT EXISTS ""Content"" text NULL;
            ALTER TABLE ""Attendances"" ADD COLUMN IF NOT EXISTS ""CheckInSessionId"" text NULL;
            CREATE TABLE IF NOT EXISTS ""CheckInSessions"" (
                ""Id""          text NOT NULL,
                ""Code""        text NOT NULL,
                ""CourseId""    text NOT NULL,
                ""TeacherId""   text NOT NULL,
                ""Date""        timestamp with time zone NOT NULL,
                ""SessionType"" text NOT NULL DEFAULT 'Lecture',
                ""IsOpen""      boolean NOT NULL DEFAULT TRUE,
                ""OpenedAt""    timestamp with time zone NOT NULL,
                ""ClosedAt""    timestamp with time zone NULL,
                CONSTRAINT ""PK_CheckInSessions"" PRIMARY KEY (""Id""),
                CONSTRAINT ""FK_CheckInSessions_Courses_CourseId""
                    FOREIGN KEY (""CourseId"") REFERENCES ""Courses"" (""Id"") ON DELETE CASCADE,
                CONSTRAINT ""FK_CheckInSessions_Users_TeacherId""
                    FOREIGN KEY (""TeacherId"") REFERENCES ""Users"" (""Id"") ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS ""IX_CheckInSessions_CourseId""  ON ""CheckInSessions"" (""CourseId"");
            CREATE INDEX IF NOT EXISTS ""IX_CheckInSessions_TeacherId"" ON ""CheckInSessions"" (""TeacherId"");
            CREATE INDEX IF NOT EXISTS ""IX_Attendances_CheckInSessionId"" ON ""Attendances"" (""CheckInSessionId"");
            INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
            VALUES ('20260602191837_AddAttendance', '9.0.3')
            ON CONFLICT DO NOTHING;
            INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
            VALUES ('20260603120000_AddCheckInSession', '9.0.3')
            ON CONFLICT DO NOTHING;
            ALTER TABLE ""CheckInSessions"" ADD COLUMN IF NOT EXISTS ""LateAfterMinutes"" integer NULL;
            ALTER TABLE ""CheckInSessions"" ADD COLUMN IF NOT EXISTS ""AutoCloseAt"" timestamp with time zone NULL;
            INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
            VALUES ('20260603140000_AddCheckInSessionSettings', '9.0.3')
            ON CONFLICT DO NOTHING;
            -- Ensure IsVisible/Degree columns exist (in case Rikus's migration hasn't run yet),
            -- then flip all existing courses to published so the Courses page isn't empty.
            ALTER TABLE ""Courses"" ADD COLUMN IF NOT EXISTS ""IsVisible"" boolean NOT NULL DEFAULT FALSE;
            ALTER TABLE ""Courses"" ADD COLUMN IF NOT EXISTS ""Degree"" text NULL;
            UPDATE ""Courses"" SET ""IsVisible"" = TRUE WHERE ""IsVisible"" = FALSE;

            -- Add Name/Code directly on Course (replaces Subject join for display).
            -- Backfill from Subjects for any existing rows that don't have them yet.
            ALTER TABLE ""Courses"" ADD COLUMN IF NOT EXISTS ""Name"" text NULL;
            ALTER TABLE ""Courses"" ADD COLUMN IF NOT EXISTS ""Code"" text NULL;
            ALTER TABLE ""Courses"" DROP CONSTRAINT IF EXISTS ""FK_Courses_Subjects_SubjectId"";
            DROP INDEX IF EXISTS ""IX_Courses_SubjectId"";
            ALTER TABLE ""Courses"" ALTER COLUMN ""SubjectId"" DROP NOT NULL;
            UPDATE ""Courses"" c
            SET ""Name"" = s.""Name"", ""Code"" = s.""Code""
            FROM ""Subjects"" s
            WHERE c.""SubjectId"" = s.""Id"" AND c.""Name"" IS NULL;
            INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
            VALUES ('20260609180000_AddCourseNameCode', '9.0.3')
            ON CONFLICT DO NOTHING;
            -- Add Name, TeacherId, DurationHours to Classes for timetabling configuration
            ALTER TABLE ""Classes"" ADD COLUMN IF NOT EXISTS ""Name"" text NULL;
            ALTER TABLE ""Classes"" ADD COLUMN IF NOT EXISTS ""TeacherId"" text NULL;
            ALTER TABLE ""Classes"" ADD COLUMN IF NOT EXISTS ""DurationHours"" numeric NULL;
            CREATE INDEX IF NOT EXISTS ""IX_Classes_TeacherId"" ON ""Classes"" (""TeacherId"");
            INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
            VALUES ('20260609190000_AddClassNameTeacherDuration', '9.0.3')
            ON CONFLICT DO NOTHING;
            -- Allow timetables to be created without a specific user FK
            ALTER TABLE ""Timetables"" ALTER COLUMN ""UserId"" DROP NOT NULL;
            INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
            VALUES ('20260609200000_MakeTimetableUserIdNullable', '9.0.3')
            ON CONFLICT DO NOTHING;";
        cmd.ExecuteNonQuery();
    }
    conn.Close();
    context.Database.Migrate();
}

// ----- Execute the Database Seeder -----
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    var context = services.GetRequiredService<AppDbContext>();
    var logger  = services.GetRequiredService<ILogger<Program>>();
    try
    {
        RealDataSeeder.Seed(context);
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "RealDataSeeder threw an exception. Database may be in a partial state.");
    }
}
// ---------------------------------------

// In development, expose Swagger UI and the OpenAPI endpoint
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Serve files from wwwroot (student submission uploads live under /uploads)
app.UseStaticFiles();

// Enable CORS before auth so preflight requests succeed
app.UseCors("AllowFrontend");

app.UseAuthorization();

// Map all controller routes (e.g. /api/Event, /api/User, etc.)
app.MapControllers();

app.Run();
