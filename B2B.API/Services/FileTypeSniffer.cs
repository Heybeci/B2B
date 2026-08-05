namespace B2B.API.Services;

/// <summary>
/// The client-supplied Content-Type header is trivially spoofable, so uploads
/// are re-checked against known magic-byte signatures for the file kinds we
/// actually accept, independent of multipart form-data hints.
/// </summary>
public static class FileTypeSniffer
{
    public static async Task<bool> MatchesDeclaredKindAsync(Stream stream, string declaredMimeType)
    {
        var header = new byte[16];
        var read = await stream.ReadAsync(header.AsMemory(0, header.Length));
        stream.Position = 0;
        if (read < 4) return false;

        return declaredMimeType switch
        {
            "image/jpeg" => header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            "image/png" => header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47,
            "image/webp" => read >= 12 && header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46
                             && header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50,
            "video/mp4" => read >= 8 && header[4] == 0x66 && header[5] == 0x74 && header[6] == 0x79 && header[7] == 0x70,
            "video/quicktime" => read >= 8 && header[4] == 0x66 && header[5] == 0x74 && header[6] == 0x79 && header[7] == 0x70,
            "application/pdf" => header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46,
            "application/postscript" or "application/illustrator" or "application/vnd.adobe.illustrator"
                => IsIllustrator(header),
            _ => false,
        };
    }

    /// <summary>
    /// Illustrator files come in two real-world variants — PDF-compatible
    /// (<c>%PDF</c>, the default since CS) and legacy EPS/PostScript
    /// (<c>%!</c>) — and either one may arrive under any of the three
    /// Illustrator MIME strings, so both signatures are accepted for all of them.
    /// </summary>
    private static bool IsIllustrator(byte[] header) =>
        (header[0] == 0x25 && header[1] == 0x21)
        || (header[0] == 0x25 && header[1] == 0x50 && header[2] == 0x44 && header[3] == 0x46);
}
