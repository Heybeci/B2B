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
