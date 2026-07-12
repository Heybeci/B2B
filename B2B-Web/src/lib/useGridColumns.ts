import { useWindowDimensions } from "react-native";

// Responsive column count shared by every card/tile grid in the app: phone
// (2), large phone (3), tablet (4), desktop (5).
export function useGridColumns(): number {
  const { width } = useWindowDimensions();
  if (width < 480) return 2;
  if (width < 768) return 3;
  if (width < 1024) return 4;
  return 5;
}
