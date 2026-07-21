import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { View } from "react-native";
import type { PointerEvent } from "react-native";
import { BADGE_SHADOW } from "../../theme/glass";

interface TooltipProps {
  label: string;
  children: ReactNode;
}

// Hover tooltip for icon-only buttons — web implementation. (The .native
// variant renders no label at all: there is no hover on touch.)
//
// The label is rendered through a react-dom portal into document.body with
// `position: fixed`, NOT as an absolutely-positioned sibling inside the
// wrapper. That is load-bearing, not a stylistic choice — an in-tree label
// cannot be positioned anywhere that works for all current consumers:
//
//  - react-native-web's base View reset sets `position: relative` AND
//    `zIndex: 0` on every View, so EVERY View is its own stacking context.
//    An in-tree label (whatever its own zIndex) can never paint above a
//    later-DOM sibling of any ancestor — e.g. a label escaping a folder-tree
//    row downward is hidden underneath the next row's opaque background.
//  - FileCard wraps its icon clusters in a Card with `overflow-hidden`, so
//    anything popping outside the card (e.g. upward from a `top-2` icon) is
//    clipped.
//  - Placing the label to the side, inside the row band (the previous
//    approach), collides with sibling icons: every consumer packs 2-4
//    tooltipped icons with only a 6px gap, so a side label lands on top of
//    the adjacent control.
//
// The portal escapes all three: no clipping, no stacking-context fights,
// and the label sits strictly below (or above, near the viewport bottom)
// the control's band, right-aligned to its right edge, so it never covers
// a sibling icon in the same cluster.
//
// Hover is tracked with raw DOM pointerenter/pointerleave (View's
// onPointerEnter/onPointerLeave — react-native-web forwards them straight to
// the DOM element), NOT with Pressable's onHoverIn/onHoverOut. That is also
// load-bearing: every consumer's child is itself a Pressable (the actual icon
// button), and RNW's Pressable wires useHover with a hard-coded
// `contain: true` — on pointerenter each Pressable dispatches a BUBBLING
// "react-gui:hover:lock" CustomEvent, and any ancestor Pressable receiving a
// lock whose target isn't itself force-ends its own hover (fires onHoverOut).
// With the old Pressable wrapper, hovering the icon's body therefore hid the
// tooltip immediately; only the wrapper's square corners outside the child's
// rounded-full circle (where DOM hit-testing misses the inner Pressable, so
// no lock is dispatched) kept it visible — the reported "shows at the edges,
// not over the icon" bug. Plain pointerenter/pointerleave on a View are
// per-(React-)subtree — entering the nested button fires nothing on the
// wrapper — and ignore the lock/unlock CustomEvents entirely. The portal
// still only mounts after a hover event, so document/window are never
// touched during Expo Router's static (Node) pre-render.

const GAP = 6;
// Rough room needed below the control (label height + gap) — only used to
// decide below vs. above; the exact label height doesn't matter beyond that.
const FLIP_THRESHOLD = 40;

interface LabelBox {
  right: number; // CSS `right` — label's right edge aligned to the control's
  top?: number; // set when placed below the control
  bottom?: number; // set when placed above the control
  maxWidth: number;
}

export function Tooltip({ label, children }: TooltipProps) {
  const anchorRef = useRef<View>(null);
  const [box, setBox] = useState<LabelBox | null>(null);

  const show = (e: PointerEvent) => {
    // Touch has no hover — don't flash the label on tap (the old
    // Pressable/useHover path had the same guard built in).
    if (e.nativeEvent.pointerType === "touch") return;
    // On web, RNW host refs ARE the underlying DOM element.
    const node = anchorRef.current as unknown as HTMLElement | null;
    if (!node || typeof node.getBoundingClientRect !== "function") return;
    const rect = node.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom >= FLIP_THRESHOLD;
    setBox({
      right: Math.max(8, window.innerWidth - rect.right),
      ...(below
        ? { top: rect.bottom + GAP }
        : { bottom: window.innerHeight - rect.top + GAP }),
      // Keep the label's left edge on-screen; it grows leftward from `right`.
      maxWidth: Math.max(60, rect.right - 8),
    });
  };

  // The fixed-position label is placed from coordinates captured at hover
  // time; if anything scrolls or resizes underneath, those go stale — just
  // hide rather than track.
  useEffect(() => {
    if (!box) return;
    const hide = () => setBox(null);
    window.addEventListener("scroll", hide, { capture: true, passive: true });
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, { capture: true });
      window.removeEventListener("resize", hide);
    };
  }, [box]);

  return (
    // Purely a hover-sensing wrapper — a plain View (NOT a Pressable, see the
    // header comment) so it never grabs focus, never reads as interactive,
    // and never participates in Pressable's hover-lock protocol. cursor:
    // "pointer" keeps the wrapper's corner slivers (outside the child
    // button's circle) looking clickable, as the old Pressable wrapper did.
    <View
      ref={anchorRef}
      style={{ cursor: "pointer" }}
      onPointerEnter={show}
      onPointerLeave={() => setBox(null)}
    >
      {children}
      {box
        ? createPortal(
            <div
              style={{
                position: "fixed",
                right: box.right,
                top: box.top,
                bottom: box.bottom,
                maxWidth: box.maxWidth,
                zIndex: 1000,
                // Never steal the hover it's reporting on (would flicker).
                pointerEvents: "none",
                backgroundColor: "rgba(24,21,15,0.92)",
                borderRadius: 6,
                padding: "4px 8px",
                boxShadow: (BADGE_SHADOW as { boxShadow?: string }).boxShadow,
                color: "#fff",
                fontSize: 11,
                lineHeight: "16px",
                // Match RNW <Text>'s default "System" font stack — a body-level
                // div would otherwise inherit whatever the page default is.
                fontFamily:
                  "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {label}
            </div>,
            document.body,
          )
        : null}
    </View>
  );
}
