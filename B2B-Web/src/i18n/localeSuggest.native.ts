// Native (iOS/Android) — no IP-based locale suggestion. A native build is
// already pinned to a single backend at build time (see apiUrl.native.ts,
// plan.md), so there's no "which deployment am I on" story to resolve here;
// native just keeps using DEFAULT_LOCALE unless the user explicitly picks one.
import type { Locale } from "./translations";

export async function suggestLocale(): Promise<Locale | null> {
  return null;
}
