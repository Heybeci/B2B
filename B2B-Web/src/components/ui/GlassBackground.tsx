import { Image, StyleSheet, View, type ViewProps } from "react-native";

// Page-level background: the bg.svg illustration (drawn entirely in "sand"
// #DFCDBE) covers the full page over a solid "light-sand" (#F7F2EE) fill —
// one shade lighter, matching stonegroup.com.tr's own body background, so
// the sand-colored art reads as a visible watermark instead of disappearing
// into an identically-colored page fill.
//
// Deliberately NOT <ImageBackground resizeMode="cover">: on web it hardcodes
// its wrapper's width/height to the SVG's own intrinsic pixel size (1789x782
// from the viewBox) instead of stretching to fill the parent, overflowing
// the page. A plain <Image> has the same problem one level down — on web it
// renders an <img>, and CSS only lets position:absolute + inset:0 stretch a
// replaced element like <img> when width/height aren't left at their default
// "auto" (auto falls back to the image's own intrinsic size instead of
// filling the container). Forcing width/height to 100% alongside the fill
// closes that gap.
export function GlassBackground({ children, style, className, ...props }: ViewProps & { className?: string }) {
  return (
    <View className={`flex-1 bg-light-sand ${className ?? ""}`} style={style} {...props}>
      <Image
        source={require("../../../assets/bg.svg")}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, { width: "100%", height: "100%" }]}
      />
      {children}
    </View>
  );
}
