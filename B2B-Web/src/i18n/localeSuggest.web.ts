// IP-based locale suggestion — WEB ONLY, fire-and-forget.
//
// Calls the backend's public GET /locale/suggest (no auth, always 200 with
// { locale: "tr"|"en"|"de"|"ru"|null } — null means "no opinion", e.g. the
// visitor is on LAN or geolocation was inconclusive). Used by LanguageContext
// only when there is NO explicit saved preference (see languageStorage) —
// this is a suggestion, never persisted, so it re-evaluates fresh every
// session/device instead of "sticking" like an explicit LanguageSwitcher pick.
//
// Uses the shared apiClient (see lib/api/client.ts) so the request goes
// through the same runtime hostname → API URL resolution as every other call
// in this app (apiUrl.web.ts) — no hardcoded host.
import { apiClient } from "../lib/api/client";
import { translations, type Locale } from "./translations";

export async function suggestLocale(): Promise<Locale | null> {
  try {
    const { data } = await apiClient.get<{ locale: Locale | null }>("/locale/suggest", { timeout: 3000 });
    if (data?.locale && data.locale in translations) return data.locale;
    return null;
  } catch {
    // Network error, timeout, malformed body, etc. — fail soft, keep
    // whatever locale is already active. Never blocks/delays first paint;
    // the caller already treats this as fire-and-forget.
    return null;
  }
}
