using System.ComponentModel.DataAnnotations;
using B2B.API.Models;

namespace B2B.API.Dtos;

public record CreateUserRequest(
    [Required, MinLength(3), MaxLength(50)] string Username,
    [Required, EmailAddress, MaxLength(256)] string Email,
    [Required, MinLength(8)] string Password,
    [Required, MaxLength(120)] string DisplayName,
    [Required] UserRole Role
);

public record UpdateUserRequest(
    [MaxLength(120)] string? DisplayName,
    UserRole? Role,
    bool? IsActive,
    [MinLength(8)] string? Password,
    [EmailAddress, MaxLength(256)] string? Email
);

public record UserDto(int Id, string Username, string Email, string DisplayName, string Role, bool IsActive, DateTime CreatedAt);
