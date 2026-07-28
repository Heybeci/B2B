namespace B2B.API.Middleware;

public class ApiException(int statusCode, string message, string? code = null) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
    public string? Code { get; } = code;

    public static ApiException BadRequest(string message, string? code = null) => new(400, message, code);
    public static ApiException Unauthorized(string message = "Kimlik doğrulama gerekli") => new(401, message);
    public static ApiException Forbidden(string message = "Bu işlem için yetkiniz yok") => new(403, message);
    public static ApiException NotFound(string message = "Kayıt bulunamadı") => new(404, message);
    public static ApiException Conflict(string message, string? code = null) => new(409, message, code);
}
