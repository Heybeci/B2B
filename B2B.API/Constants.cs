namespace B2B.API;

public static class UploadLimits
{
    public const int MaxZipFiles = 500;
    public const long MaxImageBytes = 25L * 1024 * 1024; // 25 MB
    public const long MaxVideoBytes = 2L * 1024 * 1024 * 1024; // 2 GB

    public static readonly string[] AllowedImageMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    public static readonly string[] AllowedVideoMimeTypes = ["video/mp4", "video/quicktime"];
    public static readonly string[] AllowedDocumentMimeTypes = ["application/pdf"];

    public static string[] AllAllowedMimeTypes =>
        [.. AllowedImageMimeTypes, .. AllowedVideoMimeTypes, .. AllowedDocumentMimeTypes];
}
