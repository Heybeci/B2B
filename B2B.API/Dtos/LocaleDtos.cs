namespace B2B.API.Dtos;

// Locale is null when no suggestion can be made (LAN/dev visitor, failed
// geo lookup, or a country we have no specific mapping for).
public record LocaleSuggestionDto(string? Locale);
