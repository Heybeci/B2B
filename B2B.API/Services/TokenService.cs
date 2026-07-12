using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using B2B.API.Models;

namespace B2B.API.Services;

public class JwtOptions
{
    public string AccessSecret { get; set; } = null!;
    public string RefreshSecret { get; set; } = null!;
    public int AccessTtlMinutes { get; set; } = 20;
    public int RefreshTtlDays { get; set; } = 30;
    public int PasswordResetTtlMinutes { get; set; } = 30;
}

public record GeneratedRefreshToken(string Token, string Hash, DateTime ExpiresAt);

public class TokenService(IOptions<JwtOptions> options)
{
    private readonly JwtOptions _options = options.Value;

    public string SignAccessToken(User user)
    {
        var key = new SymmetricSecurityKey(Convert.FromBase64String(_options.AccessSecret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim("role", user.Role.ToString().ToLowerInvariant()),
            new Claim("username", user.Username),
        };
        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_options.AccessTtlMinutes),
            signingCredentials: creds
        );
        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public GeneratedRefreshToken GenerateRefreshToken()
    {
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(48)).ToLowerInvariant();
        var hash = HashRefreshToken(token);
        var expiresAt = DateTime.UtcNow.AddDays(_options.RefreshTtlDays);
        return new GeneratedRefreshToken(token, hash, expiresAt);
    }

    public GeneratedRefreshToken GeneratePasswordResetToken()
    {
        var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(48)).ToLowerInvariant();
        var hash = HashPasswordResetToken(token);
        var expiresAt = DateTime.UtcNow.AddMinutes(_options.PasswordResetTtlMinutes);
        return new GeneratedRefreshToken(token, hash, expiresAt);
    }

    public string HashRefreshToken(string token) => HashToken(token);

    public string HashPasswordResetToken(string token) => HashToken(token);

    // Both refresh and password-reset tokens are opaque random values whose
    // hash is stored server-side; sharing RefreshSecret for both avoids a
    // second secret to provision without weakening either token type.
    private string HashToken(string token)
    {
        using var hmac = new HMACSHA256(Convert.FromBase64String(_options.RefreshSecret));
        var bytes = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
