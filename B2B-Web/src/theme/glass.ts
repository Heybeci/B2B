import { Platform } from "react-native";

// Kept deliberately soft: this is the default shadow for every `Card` (file
// tiles in a tight grid, hotel rows in a list, standalone cards) — an
// earlier, much heavier version (70px blur, 0.55 opacity) read fine on a
// single isolated card but pooled into hard, dark seams wherever cards sit
// close together (grid gutters, list gaps), which is most places in the app.
export const CARD_SHADOW = Platform.select({
  web: { boxShadow: "0 10px 24px rgba(24,21,15,0.16), inset 0 0 0 1px rgba(255,255,255,0.04)" },
  default: {
    shadowColor: "#18150F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 6,
  },
}) as object;

export const BUTTON_SHADOW = Platform.select({
  web: { boxShadow: "0 6px 20px rgba(184,144,63,0.45)" },
  default: {
    shadowColor: "#B8903F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
}) as object;

// Logo badge shadow — matches the reference login screen's `.login-badge`.
export const BADGE_SHADOW = Platform.select({
  web: { boxShadow: "0 8px 24px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.1)" },
  default: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
}) as object;

// Same card-shadow language as CARD_SHADOW, scaled down for small, densely
// stacked rows (e.g. folder tree rows) — CARD_SHADOW's 70px blur is sized
// for large, well-separated tiles and pools into a muddy blob when applied
// to a tight list of short rows.
export const ROW_SHADOW = Platform.select({
  web: { boxShadow: "0 3px 8px rgba(24,21,15,0.16)" },
  default: {
    shadowColor: "#18150F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 5,
    elevation: 3,
  },
}) as object;

// A visible "this one is selected" glow ring — a thin colored border alone
// gets lost against the page background, so this pairs it with a soft halo.
// Brass (the app's one accent color) rather than blue, so selection reads
// as "highlighted" rather than as a link/action.
export const ACTIVE_GLOW = Platform.select({
  web: { boxShadow: "0 0 0 4px rgba(184,144,63,0.35), 0 0 20px rgba(184,144,63,0.5)" },
  default: {
    shadowColor: "#B8903F",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 12,
  },
}) as object;
