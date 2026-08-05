namespace B2B.API;

public static class UploadLimits
{
    public const int MaxZipFiles = 500;
    public const long MaxImageBytes = 25L * 1024 * 1024; // 25 MB
    public const long MaxVideoBytes = 2L * 1024 * 1024 * 1024; // 2 GB

    public static readonly string[] AllowedImageMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    public static readonly string[] AllowedVideoMimeTypes = ["video/mp4", "video/quicktime"];
    // Adobe Illustrator has no registered IANA type; browsers/OS report .ai files
    // under any of the three variants below depending on file association.
    public static readonly string[] AllowedDocumentMimeTypes =
        ["application/pdf", "application/postscript", "application/illustrator", "application/vnd.adobe.illustrator"];

    public static string[] AllAllowedMimeTypes =>
        [.. AllowedImageMimeTypes, .. AllowedVideoMimeTypes, .. AllowedDocumentMimeTypes];
}
