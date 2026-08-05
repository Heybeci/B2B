import { useCallback, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { useWindowDimensions } from "react-native";

function columnsForWidth(width: number): number {
  if (width < 480) return 2;
  if (width < 768) return 3;
  if (width < 1024) return 4;
  return 5;
}

// Responsive column count shared by every card/tile grid in the app: phone
// (2), large phone (3), tablet (4), desktop (5) — thresholds now applied to
// the grid's own measured container width rather than the raw window width.
// Every grid in the app sits next to a fixed-width sidebar (the public
// HotelPanel, admin's nav rail, FolderBrowser's resizable tree panel), so
// window width alone overcounts columns on desktop — e.g. collapsing
// HotelPanel's sidebar frees real horizontal space for the grid, but with
// window-width breakpoints the column count would never react to it (only a
// whole-window resize crossing a threshold would). Returns [columns,
// onLayout] — wire onLayout onto the grid's wrapping View. Falls back to
// window width until the first layout pass measures the container (and for
// any caller that doesn't wire up onLayout at all).
export function useGridColumns(): [number, (event: LayoutChangeEvent) => void] {
  const { width: windowWidth } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    setContainerWidth((prev) => (prev === width ? prev : width));
  }, []);

  return [columnsForWidth(containerWidth ?? windowWidth), onLayout];
}
