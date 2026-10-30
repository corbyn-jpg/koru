using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using LearnOnline.Data;
using LearnOnline;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.IdentityModel.Tokens;

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
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("LearnOnlineDb")));

// ----- Sign-in tokens -----
// Every endpoint requires a valid token unless it is marked [AllowAnonymous] (login, Google sign-in, 2FA check).
// Without a configured Jwt:Key we generate one per run: fine for local dev, but everyone is signed out on restart.
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
{
    jwtKey = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(48));
    builder.Configuration["Jwt:Key"] = jwtKey;
    Console.WriteLine("warn: Jwt:Key is not set (or shorter than 32 characters). Using a temporary key; set one in appsettings.json.");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = AuthTokens.SigningKey(jwtKey),
            ClockSkew = TimeSpan.FromMinutes(1),
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
});

// Gzip/Brotli JSON responses: course, submission and grade lists shrink by ~80%
builder.Services.AddResponseCompression(options => options.EnableForHttps = true);

var app = builder.Build();

// ----- Apply any pending EF Core migrations -----
using (var scope = app.Services.CreateScope())
{
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
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
    app.MapOpenApi().AllowAnonymous();
}

app.UseResponseCompression();

app.UseHttpsRedirection();

// Serve files from wwwroot (student submission uploads live under /uploads)
app.UseStaticFiles();

// Enable CORS before auth so preflight requests succeed
app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

// Map all controller routes (e.g. /api/Event, /api/User, etc.)
app.MapControllers();

app.Run();
