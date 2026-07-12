using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using B2B.API.Data;
using B2B.API.Dtos;
using B2B.API.Middleware;
using B2B.API.Models;
using B2B.Configuration;

namespace B2B.API.Services;

public class UserService(
    AppDbContext db,
    TokenService tokens,
    EmailSender emailSender,
    IPublicWebUrlProvider webUrlProvider,
    IOptions<JwtOptions> jwtOptions,
    ILogger<UserService> logger)
{
    private static UserDto ToDto(User u) =>
        new(u.Id, u.Username, u.Email, u.DisplayName, u.Role.ToString().ToLowerInvariant(), u.IsActive, u.CreatedAt);

    public async Task<List<UserDto>> ListAsync(string callerRole)
    {
        var query = db.Users.AsQueryable();
        if (callerRole != "admin") query = query.Where(u => u.Role != UserRole.Admin);
        return await query.OrderBy(u => u.CreatedAt).Select(u => ToDto(u)).ToListAsync();
    }

    public Task<User?> FindByUsernameAsync(string username) =>
        db.Users.FirstOrDefaultAsync(u => u.Username == username);

    public async Task<UserDto> CreateAsync(CreateUserRequest input, string callerRole)
    {
        if (callerRole != "admin" && input.Role == UserRole.Admin)
        {
            throw ApiException.Forbidden("Bu rolü atama yetkiniz yok");
        }
        if (await FindByUsernameAsync(input.Username) is not null)
        {
            throw ApiException.Conflict("Bu kullanıcı adı zaten kullanılıyor");
        }
        if (await db.Users.AnyAsync(u => u.Email == input.Email))
        {
            throw ApiException.Conflict("Bu e-posta adresi zaten kullanılıyor");
        }
        var user = new User
        {
            Username = input.Username,
            Email = input.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(input.Password, workFactor: 12),
            DisplayName = input.DisplayName,
            Role = input.Role,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        await SendWelcomeEmailAsync(user);

        return ToDto(user);
    }

    // New users get a "set your password" link instead of their admin-chosen
    // password in plaintext — reuses the same reset-token mechanism as the
    // forgot-password flow (AuthService.ForgotPasswordAsync).
    private async Task SendWelcomeEmailAsync(User user)
    {
        var reset = tokens.GeneratePasswordResetToken();
        db.PasswordResetTokens.Add(new PasswordResetToken { UserId = user.Id, TokenHash = reset.Hash, ExpiresAt = reset.ExpiresAt });
        await db.SaveChangesAsync();

        var webUrl = webUrlProvider.GetPublicWebUrl().TrimEnd('/');
        var resetLink = $"{webUrl}/reset-password?token={reset.Token}";
        var loginLink = $"{webUrl}/login";
        var roleLabel = user.Role switch
        {
            UserRole.Admin => "Sistem Yöneticisi",
            UserRole.Manager => "Yönetici",
            _ => "Kullanıcı",
        };
        var body = $"<p>Merhaba {user.DisplayName},</p>" +
                   "<p>Stone Group Media Portal'da sizin için bir hesap oluşturuldu:</p>" +
                   "<ul>" +
                   $"<li>Kullanıcı adı: <b>{user.Username}</b></li>" +
                   $"<li>E-posta: {user.Email}</li>" +
                   $"<li>Rol: {roleLabel}</li>" +
                   "</ul>" +
                   $"<p>Şifrenizi belirlemek için <a href=\"{resetLink}\">bu bağlantıya</a> tıklayın. " +
                   $"Bağlantı {jwtOptions.Value.PasswordResetTtlMinutes} dakika içinde geçersiz olur.</p>" +
                   $"<p>Giriş sayfası: <a href=\"{loginLink}\">{loginLink}</a></p>";

        try
        {
            await emailSender.SendAsync(user.Email, "Stone Group Media Portal — Hesabınız oluşturuldu", body);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Hoş geldiniz e-postası gönderilemedi (kullanıcı {UserId})", user.Id);
        }
    }

    public async Task<UserDto> UpdateAsync(int id, UpdateUserRequest input, string callerRole)
    {
        var user = await db.Users.FindAsync(id) ?? throw ApiException.NotFound("Kullanıcı bulunamadı");
        if (callerRole != "admin")
        {
            if (user.Role == UserRole.Admin) throw ApiException.NotFound("Kullanıcı bulunamadı");
            if (input.Role == UserRole.Admin) throw ApiException.Forbidden("Bu rolü atama yetkiniz yok");
        }
        if (input.DisplayName is not null) user.DisplayName = input.DisplayName;
        if (input.Role is not null) user.Role = input.Role.Value;
        if (input.IsActive is not null) user.IsActive = input.IsActive.Value;
        if (input.Password is not null) user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(input.Password, workFactor: 12);
        if (input.Email is not null) user.Email = input.Email;
        user.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return ToDto(user);
    }

    public static bool VerifyPassword(string plain, string hash) => BCrypt.Net.BCrypt.Verify(plain, hash);
}
