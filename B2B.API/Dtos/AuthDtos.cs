using System.ComponentModel.DataAnnotations;

namespace B2B.API.Dtos;

public record LoginRequest(
    [Required] string Username,
    [Required] string Password
);

public record RefreshRequest([Required] string RefreshToken);

public record ForgotPasswordRequest([Required, EmailAddress] string Email);

public record ResetPasswordRequest([Required] string Token, [Required, MinLength(8)] string NewPassword);

public record AuthUserDto(int Id, string Username, string DisplayName, string Role, string[] Permissions);

public record TokenPairDto(string AccessToken, string RefreshToken, AuthUserDto User);
