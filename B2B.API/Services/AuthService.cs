using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using B2B.API.Data;
using B2B.API.Dtos;
using B2B.API.Middleware;
using B2B.API.Models;
using B2B.Configuration;

namespace B2B.API.Services;

public class AuthService(
    AppDbContext db,
    TokenService tokens,
    UserService users,
    EmailSender emailSender,
    PermissionService permissions,
    AuditLogService auditLogs,
    IHttpContextAccessor httpContextAccessor,
    IPublicWebUrlProvider webUrlProvider,
    IOptions<JwtOptions> jwtOptions,
    ILogger<AuthService> logger)
{
    private async Task<AuthUserDto> ToAuthUserAsync(User u)
    {
        var role = u.Role.ToString().ToLowerInvariant();
        return new(u.Id, u.Username, u.DisplayName, role, await permissions.GetPermissionsForRoleAsync(role));
    }

    private async Task<TokenPairDto> IssueTokenPairAsync(User user)
    {
        var accessToken = tokens.SignAccessToken(user);
        var refresh = tokens.GenerateRefreshToken();
        db.RefreshTokens.Add(new RefreshToken { UserId = user.Id, TokenHash = refresh.Hash, ExpiresAt = refresh.ExpiresAt });
        await db.SaveChangesAsync();
        return new TokenPairDto(accessToken, refresh.Token, await ToAuthUserAsync(user));
    }

    public async Task<TokenPairDto> LoginAsync(string username, string password)
    {
        var ipAddress = httpContextAccessor.HttpContext?.Connection.RemoteIpAddress?.ToString();
        var userAgent = httpContextAccessor.HttpContext?.Request.Headers.UserAgent.ToString();

        var user = await users.FindByUsernameAsync(username);
        if (user is null || !user.IsActive || !UserService.VerifyPassword(password, user.PasswordHash))
        {
            // AuditLogs.UserId is a required FK (B2B.Database/Tables/AuditLogs.sql) —
            // a row can only be attached to a real account. When the username
            // resolves to an existing (if inactive, or wrong-password) user we
            // still have a valid UserId to log against; a completely unknown
            // username has nothing to attach to, so it goes through the app
            // logger instead (still captures IP/UA for brute-force triage,
            // just not surfaced in the /admin/audit-logs table).
            if (user is not null)
            {
                await auditLogs.LogAsync(
                    userId: user.Id,
                    action: "Login",
                    entityType: "Auth",
                    entityId: null,
                    details: "Invalid credentials",
                    statusCode: 401,
                    ipAddress: ipAddress,
                    userAgent: userAgent);
            }
            else
            {
                logger.LogWarning(
                    "Failed login attempt for unknown username {Username} from {IpAddress} ({UserAgent})",
                    username, ipAddress, userAgent);
            }

            throw ApiException.Unauthorized("Kullanıcı adı veya şifre hatalı");
        }

        await auditLogs.LogAsync(
            userId: user.Id,
            action: "Login",
            entityType: "Auth",
            entityId: user.Id,
            details: $"Login attempt: {username}",
            statusCode: 200,
            ipAddress: ipAddress,
            userAgent: userAgent);

        return await IssueTokenPairAsync(user);
    }

    public async Task<TokenPairDto> RefreshAsync(string refreshToken)
    {
        var hash = tokens.HashRefreshToken(refreshToken);
        var existing = await db.RefreshTokens
            .Include(r => r.User)
            .Where(r => r.TokenHash == hash && r.RevokedAt == null)
            .FirstOrDefaultAsync();

        if (existing is null || existing.ExpiresAt < DateTime.UtcNow || !existing.User.IsActive)
        {
            throw ApiException.Unauthorized("Oturum geçersiz, lütfen tekrar giriş yapın");
        }

        existing.RevokedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
        return await IssueTokenPairAsync(existing.User);
    }

    public async Task LogoutAsync(string refreshToken)
    {
        var hash = tokens.HashRefreshToken(refreshToken);
        var tokensToRevoke = await db.RefreshTokens
            .Where(r => r.TokenHash == hash && r.RevokedAt == null)
            .ToListAsync();
        foreach (var t in tokensToRevoke) t.RevokedAt = DateTime.UtcNow;
        await db.SaveChangesAsync();
    }

    // Always completes without revealing whether the email matched an
    // account — the controller returns the same response either way, so
    // this can't be used to enumerate registered users.
    public async Task ForgotPasswordAsync(string email)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user is null || !user.IsActive) return;

        var reset = tokens.GeneratePasswordResetToken();
        db.PasswordResetTokens.Add(new PasswordResetToken { UserId = user.Id, TokenHash = reset.Hash, ExpiresAt = reset.ExpiresAt });
        await db.SaveChangesAsync();

        var link = $"{webUrlProvider.GetPublicWebUrl().TrimEnd('/')}/reset-password?token={reset.Token}";
        var body = $"<p>Merhaba {user.DisplayName},</p>" +
                   $"<p>Şifrenizi sıfırlamak için <a href=\"{link}\">bu bağlantıya</a> tıklayın. Bağlantı {jwtOptions.Value.PasswordResetTtlMinutes} dakika içinde geçersiz olur.</p>" +
                   "<p>Bu talebi siz oluşturmadıysanız bu e-postayı yok sayabilirsiniz.</p>";

        try
        {
            await emailSender.SendAsync(user.Email, "Şifre sıfırlama", body);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Şifre sıfırlama e-postası gönderilemedi (kullanıcı {UserId})", user.Id);
        }
    }

    public async Task ResetPasswordAsync(string token, string newPassword)
    {
        var hash = tokens.HashPasswordResetToken(token);
        var reset = await db.PasswordResetTokens
            .Include(r => r.User)
            .Where(r => r.TokenHash == hash && r.UsedAt == null)
            .FirstOrDefaultAsync();

        if (reset is null || reset.ExpiresAt < DateTime.UtcNow)
        {
            throw ApiException.BadRequest("Bağlantı geçersiz veya süresi dolmuş");
        }

        reset.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword, workFactor: 12);
        reset.User.UpdatedAt = DateTime.UtcNow;
        reset.UsedAt = DateTime.UtcNow;

        var activeRefreshTokens = await db.RefreshTokens
            .Where(r => r.UserId == reset.UserId && r.RevokedAt == null)
            .ToListAsync();
        foreach (var t in activeRefreshTokens) t.RevokedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
    }
}
