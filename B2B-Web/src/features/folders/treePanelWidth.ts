import { Platform } from "react-native";

// Persists the user's chosen folder-tree panel width. Resizing itself is a
// web-only, desktop-only feature (see FolderBrowser), so unlike
// languageStorage there's no .native variant — a Platform guard is enough.
// The `typeof window` check keeps Expo Router's static (Node) pre-render
// from touching localStorage, same rationale as apiUrl.web.ts.

const TREE_WIDTH_KEY = "sgb2b.treePanelWidth";

export const treePanelWidth = {
  get(): number | null {
    if (Platform.OS !== "web" || typeof window === "undefined") return null;
    const stored = window.localStorage.getItem(TREE_WIDTH_KEY);
    if (!stored) return null;
    const parsed = parseInt(stored, 10);
    return Number.isFinite(parsed) ? parsed : null;
  },
  set(width: number): void {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    window.localStorage.setItem(TREE_WIDTH_KEY, String(Math.round(width)));
  },
};
