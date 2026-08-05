import { View } from "react-native";

// Minimal hand-drawn glyphs built from Views (consistent with the rest of the
// app's icon approach — no icon library dependency for a couple of small marks).

export function EyeIcon({ color = "#fff" }: { color?: string }) {
  return (
    <View
      style={{
        width: 15,
        height: 9,
        borderRadius: 999,
        borderWidth: 1.5,
        borderColor: color,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
    </View>
  );
}

// Points right when collapsed, rotates down when expanded — standard tree
// disclosure triangle, built the same border-triangle way as DownloadIcon's arrow.
export function ChevronIcon({ expanded, color = "#3A342B" }: { expanded?: boolean; color?: string }) {
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 6,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        borderTopColor: color,
        transform: [{ rotate: expanded ? "0deg" : "-90deg" }],
      }}
    />
  );
}

// A simple trash-can silhouette (lid + bin), built the same View-based way
// as the other glyphs here rather than pulling in an icon library.
export function TrashIcon({ color = "#fff" }: { color?: string }) {
  return (
    <View style={{ width: 11, height: 12, alignItems: "center" }}>
      <View style={{ width: 11, height: 1.5, backgroundColor: color }} />
      <View style={{ width: 5, height: 1.5, backgroundColor: color, marginTop: -1 }} />
      <View
        style={{
          width: 9,
          height: 9,
          marginTop: 1,
          borderWidth: 1.5,
          borderTopWidth: 0,
          borderColor: color,
          borderBottomLeftRadius: 2,
          borderBottomRightRadius: 2,
        }}
      />
    </View>
  );
}

// A pencil seen tip-down: a short rounded shaft with a border-triangle tip,
// rotated 45° — same border-triangle trick DownloadIcon/ChevronIcon use.
export function PencilIcon({ color = "#fff" }: { color?: string }) {
  return (
    <View style={{ width: 12, height: 12, alignItems: "center", justifyContent: "center" }}>
      <View style={{ alignItems: "center", transform: [{ rotate: "45deg" }] }}>
        <View
          style={{
            width: 3.5,
            height: 7.5,
            backgroundColor: color,
            borderTopLeftRadius: 1,
            borderTopRightRadius: 1,
          }}
        />
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 1.75,
            borderRightWidth: 1.75,
            borderTopWidth: 3,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderTopColor: color,
          }}
        />
      </View>
    </View>
  );
}

// A rightwards arrow ("move into…"): shaft + border-triangle head, the same
// construction as DownloadIcon's arrow but rotated to horizontal.
export function MoveIcon({ color = "#fff" }: { color?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View style={{ width: 6, height: 2, backgroundColor: color }} />
      <View
        style={{
          width: 0,
          height: 0,
          borderTopWidth: 4,
          borderBottomWidth: 4,
          borderLeftWidth: 5,
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
          borderLeftColor: color,
        }}
      />
    </View>
  );
}

// A 2x3 dot grid — the classic "grip"/drag-handle glyph, built the same
// View-based dot construction as KebabIcon's three stacked dots.
export function DragHandleIcon({ color = "#3A342B" }: { color?: string }) {
  return (
    <View style={{ width: 10, height: 14, justifyContent: "space-between" }}>
      {[0, 1, 2].map((row) => (
        <View key={row} style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
          <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: color }} />
        </View>
      ))}
    </View>
  );
}

export function DownloadIcon({ color = "#fff" }: { color?: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: 2, height: 6, backgroundColor: color }} />
      <View
        style={{
          width: 0,
          height: 0,
          borderLeftWidth: 4,
          borderRightWidth: 4,
          borderTopWidth: 5,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: color,
        }}
      />
      <View style={{ width: 11, height: 2, backgroundColor: color, marginTop: 3 }} />
    </View>
  );
}

// A checkmark built from two rotated bars (short down-stroke + long
// up-stroke), same View-based construction as the other glyphs here.
export function CheckIcon({ color = "#22c55e" }: { color?: string }) {
  return (
    <View
      style={{
        width: 12,
        height: 12,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Short diagonal line (down-left to center) */}
      <View
        style={{
          position: "absolute",
          width: 2,
          height: 4,
          backgroundColor: color,
          transform: [{ rotate: "-45deg" }, { translateX: -1.5 }, { translateY: 1 }],
        }}
      />
      {/* Longer diagonal line (center to up-right) */}
      <View
        style={{
          position: "absolute",
          width: 2,
          height: 7,
          backgroundColor: color,
          transform: [{ rotate: "45deg" }, { translateX: 2.5 }, { translateY: -1 }],
        }}
      />
    </View>
  );
}

// Three small dots stacked vertically — the "more actions" (kebab) trigger,
// built the same View-based way as the other glyphs here.
export function KebabIcon({ color = "#fff" }: { color?: string }) {
  return (
    <View style={{ width: 12, height: 12, alignItems: "center", justifyContent: "center" }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: 2.5,
            height: 2.5,
            borderRadius: 1.25,
            backgroundColor: color,
            marginVertical: 1,
          }}
        />
      ))}
    </View>
  );
}

// A left/right pointing solid triangle — slider prev/next navigation, same
// border-triangle construction as DownloadIcon/MoveIcon's arrowheads.
export function NavArrowIcon({ direction, color = "#fff" }: { direction: "left" | "right"; color?: string }) {
  const pointsRight = direction === "right";
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderTopWidth: 7,
        borderBottomWidth: 7,
        borderTopColor: "transparent",
        borderBottomColor: "transparent",
        borderLeftWidth: pointsRight ? 8 : 0,
        borderRightWidth: pointsRight ? 0 : 8,
        borderLeftColor: pointsRight ? color : "transparent",
        borderRightColor: pointsRight ? "transparent" : color,
      }}
    />
  );
}

// A counter-clockwise "undo/restore" arrow: a near-full circle built the same
// border-circle way as EyeIcon (one side left transparent to open the ring),
// rotated so the opening sits at the bottom-right, plus a small border-triangle
// arrowhead (DownloadIcon/ChevronIcon's technique) at the ring's start so the
// direction of travel reads as counter-clockwise.
export function RestoreIcon({ color = "#3A342B" }: { color?: string }) {
  return (
    <View style={{ width: 14, height: 14, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: 11,
          height: 11,
          borderRadius: 999,
          borderWidth: 1.5,
          borderColor: color,
          borderBottomColor: "transparent",
          borderRightColor: "transparent",
          transform: [{ rotate: "-25deg" }],
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 1,
          width: 0,
          height: 0,
          borderLeftWidth: 3,
          borderRightWidth: 3,
          borderBottomWidth: 4,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: color,
          transform: [{ rotate: "115deg" }],
        }}
      />
    </View>
  );
}

// A minimal camera silhouette (viewfinder bump + body + lens), built the same
// border-box/border-circle way as the other glyphs here — used next to the
// per-hotel photo count on the hotel list cards.
export function CameraIcon({ color = "#6B6252" }: { color?: string }) {
  return (
    <View style={{ width: 13, height: 11, alignItems: "center" }}>
      <View style={{ width: 5, height: 2, backgroundColor: color, borderTopLeftRadius: 1, borderTopRightRadius: 1 }} />
      <View
        style={{
          width: 13,
          height: 9,
          marginTop: -1,
          borderRadius: 2,
          borderWidth: 1.5,
          borderColor: color,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: 4.5, height: 4.5, borderRadius: 2.25, borderWidth: 1.2, borderColor: color }} />
      </View>
    </View>
  );
}

// An "X" built from two crossed bars, for a failed-item indicator.
export function ErrorIcon({ color = "#ef4444" }: { color?: string }) {
  return (
    <View style={{ width: 12, height: 12, alignItems: "center", justifyContent: "center" }}>
      {/* Diagonal 1: top-left to bottom-right */}
      <View
        style={{
          position: "absolute",
          width: 2,
          height: 9,
          backgroundColor: color,
          transform: [{ rotate: "45deg" }],
        }}
      />
      {/* Diagonal 2: top-right to bottom-left */}
      <View
        style={{
          position: "absolute",
          width: 2,
          height: 9,
          backgroundColor: color,
          transform: [{ rotate: "-45deg" }],
        }}
      />
    </View>
  );
}
