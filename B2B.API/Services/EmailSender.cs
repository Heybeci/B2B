using System.Net;
using System.Net.Mail;
using B2B.API.Data;
using B2B.API.Middleware;
using Microsoft.EntityFrameworkCore;

namespace B2B.API.Services;

// SMTP settings live in the EmailSettings table (admin-editable), not
// appsettings — so we read a fresh row per send rather than binding options
// once at startup.
public class EmailSender(AppDbContext db)
{
    public async Task SendAsync(string to, string subject, string htmlBody)
    {
        var settings = await db.EmailSettings.FirstOrDefaultAsync();
        if (settings is null || string.IsNullOrEmpty(settings.SmtpHost))
        {
            throw ApiException.BadRequest("E-posta ayarları henüz yapılandırılmamış");
        }

        using var client = new SmtpClient(settings.SmtpHost, settings.SmtpPort)
        {
            EnableSsl = settings.EnableSsl,
            Credentials = new NetworkCredential(settings.SmtpUsername, settings.SmtpPassword),
        };
        using var message = new MailMessage
        {
            From = new MailAddress(settings.FromAddress, settings.FromName),
            Subject = subject,
            Body = htmlBody,
            IsBodyHtml = true,
        };
        message.To.Add(to);

        await client.SendMailAsync(message);
    }
}
