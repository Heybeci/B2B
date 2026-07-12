namespace B2B.API.Models;

public class EmailSettings
{
    public int Id { get; set; }
    public string SmtpHost { get; set; } = null!;
    public int SmtpPort { get; set; }
    public string SmtpUsername { get; set; } = null!;
    public string SmtpPassword { get; set; } = null!;
    public string FromAddress { get; set; } = null!;
    public string FromName { get; set; } = null!;
    public bool EnableSsl { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
