using Microsoft.EntityFrameworkCore;
using B2B.API.Data;
using B2B.API.Dtos;
using B2B.API.Models;

namespace B2B.API.Services;

public class EmailSettingsService(AppDbContext db)
{
    private static EmailSettingsDto ToDto(EmailSettings s) =>
        new(s.SmtpHost, s.SmtpPort, s.SmtpUsername, !string.IsNullOrEmpty(s.SmtpPassword), s.FromAddress, s.FromName, s.EnableSsl);

    public async Task<EmailSettingsDto> GetAsync()
    {
        var settings = await db.EmailSettings.FirstOrDefaultAsync() ?? new EmailSettings { Id = 1 };
        return ToDto(settings);
    }

    public async Task<EmailSettingsDto> UpdateAsync(UpdateEmailSettingsRequest input)
    {
        var settings = await db.EmailSettings.FirstOrDefaultAsync();
        if (settings is null)
        {
            settings = new EmailSettings { Id = 1 };
            db.EmailSettings.Add(settings);
        }

        settings.SmtpHost = input.SmtpHost;
        settings.SmtpPort = input.SmtpPort;
        settings.SmtpUsername = input.SmtpUsername;
        if (!string.IsNullOrEmpty(input.SmtpPassword)) settings.SmtpPassword = input.SmtpPassword;
        settings.FromAddress = input.FromAddress;
        settings.FromName = input.FromName;
        settings.EnableSsl = input.EnableSsl;
        settings.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return ToDto(settings);
    }
}
