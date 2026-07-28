using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using B2B.API.Data;
using B2B.API.Dtos;
using B2B.API.Services;

namespace B2B.API.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AuthService authService, AppDbContext db, PermissionService permissions) : ControllerBase
{
    // Brute-force-prone endpoints — stricter per-IP rate limit ("auth"
    // policy, Program.cs) on top of the app-wide global limiter.
    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<ActionResult<TokenPairDto>> Login(LoginRequest input) =>
        await authService.LoginAsync(input.Username, input.Password);

    [HttpPost("refresh")]
    public async Task<ActionResult<TokenPairDto>> Refresh(RefreshRequest input) =>
        await authService.RefreshAsync(input.RefreshToken);

    [EnableRateLimiting("auth")]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest input)
    {
        await authService.ForgotPasswordAsync(input.Email);
        return NoContent();
    }

    [EnableRateLimiting("auth")]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest input)
    {
        await authService.ResetPasswordAsync(input.Token, input.NewPassword);
        return NoContent();
    }

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(RefreshRequest? input)
    {
        if (!string.IsNullOrEmpty(input?.RefreshToken))
        {
            await authService.LogoutAsync(input.RefreshToken);
        }
        return NoContent();
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<AuthUserDto>> Me()
    {
        var user = await db.Users.FindAsync(User.GetUserId());
        if (user is null) return NotFound();
        var role = user.Role.ToString().ToLowerInvariant();
        return new AuthUserDto(user.Id, user.Username, user.DisplayName, role, await permissions.GetPermissionsForRoleAsync(role));
    }
}
