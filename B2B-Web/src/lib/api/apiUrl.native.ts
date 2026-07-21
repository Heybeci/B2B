// Native (iOS/Android) API URL resolution — build-time, intentionally NOT
// hostname-based. Native binaries are not deployed to IIS sites; a given
// build always talks to a single API, so the original EXPO_PUBLIC_API_URL
// behavior is kept as-is. Only the web platform (apiUrl.web.ts) resolves the
// API address at runtime from the page hostname.
export function resolveApiUrl(): string {
  return process.env.EXPO_PUBLIC_API_URL ?? "http://dev.b2b/b2b.api/api";
}
