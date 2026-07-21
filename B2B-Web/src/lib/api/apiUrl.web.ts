// Runtime (hostname-based) API URL resolution — WEB ONLY.
//
// Mirrors the backend's B2B.Configuration providers (ConnectionStringProvider /
// PublicWebUrlProvider): the SAME exported dist/ works on every IIS site
// because the API address is derived from window.location.hostname at runtime
// instead of being baked in at build time. Keep this switch in sync with the
// backend's hostname mapping.
//
// IMPORTANT — static rendering: `expo export --platform web` pre-renders every
// route in Node.js, where `window` is UNDEFINED (documented Expo Router
// behavior; `typeof window === "undefined"` is the documented server check).
// The guard below keeps module evaluation from crashing during prerender. The
// prerender fallback value never reaches a real request: all API calls happen
// client-side (react-query fetches after hydration, downloads are
// user-triggered), so no API URL is ever baked into the static HTML.

const HOSTNAME_API_URLS: Record<string, string> = {
  // Expo dev server (http://localhost:8081) → dev/test IIS backend.
  localhost: "http://dev.b2b/b2b.api/api",
  // Dev/test IIS site (frontend at site root, backend nested under it).
  "dev.b2b": "http://dev.b2b/b2b.api/api",
  // Real production (SGAPPSRV) — same nested layout.
  b2b: "http://b2b/b2b.api/api",
};

export function resolveApiUrl(): string {
  if (typeof window === "undefined") {
    // Node.js prerender (static rendering) — no real requests are made here.
    return process.env.EXPO_PUBLIC_API_URL ?? "http://dev.b2b/b2b.api/api";
  }
  const mapped = HOSTNAME_API_URLS[window.location.hostname.toLowerCase()];
  if (mapped) return mapped;
  // Unknown hostname: honor a build-time env override if present, otherwise
  // assume the standard deployment shape (backend nested under the site root).
  return process.env.EXPO_PUBLIC_API_URL ?? `${window.location.origin}/b2b.api/api`;
}
