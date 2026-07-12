using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace B2B.API.Services;

public static partial class SlugService
{
    [GeneratedRegex("[^a-z0-9]+")]
    private static partial Regex NonAlphaNumeric();

    [GeneratedRegex("^-+|-+$")]
    private static partial Regex EdgeDashes();

    public static string Slugify(string input)
    {
        var normalized = input.Normalize(NormalizationForm.FormKD);
        var sb = new StringBuilder();
        foreach (var c in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(c);
            if (category != UnicodeCategory.NonSpacingMark)
            {
                sb.Append(c);
            }
        }

        var slug = sb.ToString().ToLowerInvariant().Replace('ı', 'i');
        slug = NonAlphaNumeric().Replace(slug, "-");
        slug = EdgeDashes().Replace(slug, "");
        if (slug.Length > 200) slug = slug[..200];
        return string.IsNullOrEmpty(slug) ? "hotel" : slug;
    }
}
