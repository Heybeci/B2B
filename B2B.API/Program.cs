using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using B2B.API.Data;
using B2B.API.Middleware;
using B2B.API.Services;
using B2B.Configuration;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection("Jwt"));
builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection("Storage"));

builder.Services.AddHttpContextAccessor();
builder.Services.AddSingleton<IConnectionStringProvider, ConnectionStringProvider>();
builder.Services.AddSingleton<IPublicWebUrlProvider, PublicWebUrlProvider>();

builder.Services.AddDbContext<AppDbContext>((sp, options) =>
    options.UseSqlServer(sp.GetRequiredService<IConnectionStringProvider>().GetConnectionString()));

builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<StorageService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<HotelService>();
builder.Services.AddScoped<FolderService>();
builder.Services.AddScoped<FileService>();
builder.Services.AddScoped<ZipService>();
builder.Services.AddScoped<EmailSender>();
builder.Services.AddScoped<EmailSettingsService>();
builder.Services.AddScoped<AuditLogService>();
builder.Services.AddScoped<AuditLogActionFilter>();
builder.Services.AddScoped<PermissionService>();

// CreateUserRequest/UpdateUserRequest.Role is a raw UserRole enum; the
// frontend posts it as a string ("admin"/"staff"), which System.Text.Json
// can't bind to an enum without this converter (case-insensitive on read).
builder.Services.AddControllers(options => options.Filters.Add<AuditLogActionFilter>())
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo { Title = "B2B API", Version = "v1" });

    options.AddSecurityDefinition("bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "JWT access token. \"Bearer \" ön ekini yazmanıza gerek yok, sadece token'ı girin.",
    });
    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("bearer", document)] = [],
    });
});

var corsOrigins = builder.Configuration.GetSection("CorsOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        if (corsOrigins.Length > 0)
        {
            policy.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod();
        }
        else
        {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        }
    });
});

var jwtSection = builder.Configuration.GetSection("Jwt");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Convert.FromBase64String(jwtSection["AccessSecret"]!)),
            ValidateIssuer = false,
            ValidateAudience = false,
            RoleClaimType = "role",
            NameClaimType = "sub",
            ClockSkew = TimeSpan.FromSeconds(30),
        };
    });
builder.Services.AddAuthorization();

// Uploaded media can be large (video); raise Kestrel's default request body limit.
builder.WebHost.ConfigureKestrel(o => o.Limits.MaxRequestBodySize = 2_100_000_000);
builder.Services.Configure<Microsoft.AspNetCore.Http.Features.FormOptions>(o =>
{
    o.MultipartBodyLengthLimit = 2_100_000_000;
});

var app = builder.Build();

app.UseMiddleware<ExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        // Relative (no leading slash) so it resolves against the current page URL
        // (works both at Kestrel root and behind IIS's /b2b.api path prefix).
        options.SwaggerEndpoint("v1/swagger.json", "B2B API v1");
    });
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.MapControllers();

var storageRoot = builder.Configuration.GetSection("Storage")["Root"] ?? "./storage";
Directory.CreateDirectory(Path.GetFullPath(storageRoot));

if (args.Contains("seed"))
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var seedSection = builder.Configuration.GetSection("SeedAdmin");
    var username = seedSection["Username"] ?? "admin";
    var password = seedSection["Password"] ?? throw new InvalidOperationException("SeedAdmin:Password not configured");
    var displayName = seedSection["DisplayName"] ?? "Yönetici";
    var email = seedSection["Email"] ?? throw new InvalidOperationException("SeedAdmin:Email not configured");

    if (await db.Users.AnyAsync(u => u.Username == username))
    {
        Console.WriteLine($"Admin \"{username}\" already exists, skipping seed.");
    }
    else
    {
        db.Users.Add(new B2B.API.Models.User
        {
            Username = username,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password, workFactor: 12),
            DisplayName = displayName,
            Role = B2B.API.Models.UserRole.Admin,
        });
        await db.SaveChangesAsync();
        Console.WriteLine($"Seeded admin user \"{username}\".");
    }
    return;
}

app.Run();

public partial class Program { }
