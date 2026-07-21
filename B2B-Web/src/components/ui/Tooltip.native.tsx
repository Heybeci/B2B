import type { ReactNode } from "react";
import { Pressable } from "react-native";

interface TooltipProps {
  label: string;
  children: ReactNode;
}

// Native is touch-only — there is no hover, so the label never shows and
// this is just a pass-through wrapper. It stays a Pressable (matching the
// web variant's wrapper) so the two platforms lay out identically.
// See Tooltip.web.tsx for the actual tooltip and the reasoning behind its
// portal-based placement.
export function Tooltip({ children }: TooltipProps) {
  return (
    <Pressable accessible={false} focusable={false}>
      {children}
    </Pressable>
  );
}
