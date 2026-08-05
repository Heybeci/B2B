import type { View } from "react-native";

export interface DragReorderOptions<T> {
  items: T[];
  getId: (item: T) => number;
  onReorder: (orderedIds: number[]) => void;
  layout?: "list" | "grid";
  enabled?: boolean;
}

export interface DragReorderResult<T> {
  items: T[];
  draggingId: number | null;
  getItemRef: (id: number) => (node: View | null) => void;
  getHandleRef: (id: number) => (node: View | null) => void;
}

// Native is touch-only — there is no mouse-driven drag here, matching
// Tooltip.native.tsx's "no hover on touch" reasoning. This is a no-op stub
// with the exact same shape as useDragReorder.web.ts so call sites
// (FolderTree, FolderBrowser) never need a Platform.OS branch: refs are
// simply never attached to anything, `items` always passes the input array
// straight through, and dragging never starts.
export function useDragReorder<T>({ items }: DragReorderOptions<T>): DragReorderResult<T> {
  return {
    items,
    draggingId: null,
    getItemRef: () => () => {},
    getHandleRef: () => () => {},
  };
}
