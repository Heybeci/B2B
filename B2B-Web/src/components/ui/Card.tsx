import { View, type ViewProps } from "react-native";
import { CARD_SHADOW } from "../../theme/glass";

export function Card({ className = "", style, ...props }: ViewProps & { className?: string }) {
  return (
    <View
      className={`bg-paper/90 border border-ink-900/10 rounded-2xl ${className}`}
      style={[CARD_SHADOW, style]}
      {...props}
    />
  );
}
