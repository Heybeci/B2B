using System.ComponentModel.DataAnnotations;

namespace B2B.API.Dtos;

public record EmailSettingsDto(
    string SmtpHost,
    int SmtpPort,
    string SmtpUsername,
    bool HasPassword,
    string FromAddress,
    string FromName,
    bool EnableSsl
);

public record UpdateEmailSettingsRequest(
    [Required] string SmtpHost,
    [Required] int SmtpPort,
    [Required] string SmtpUsername,
    string? SmtpPassword,
    [Required, EmailAddress] string FromAddress,
    [Required] string FromName,
    [Required] bool EnableSsl
);
