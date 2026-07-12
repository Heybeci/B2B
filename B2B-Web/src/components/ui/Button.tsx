import { ActivityIndicator, Pressable, Text, type PressableProps } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BUTTON_SHADOW } from "../../theme/glass";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends Omit<PressableProps, "children"> {
  label: string;
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<Variant, { container: string; label: string }> = {
  secondary: {
    container: "bg-ink-900/5 border border-ink-900/20 active:bg-ink-900/10",
    label: "text-ink-900",
  },
  ghost: {
    container: "bg-transparent active:bg-ink-900/10",
    label: "text-ink-700",
  },
  danger: {
    container: "bg-transparent border border-red-500/40 active:bg-red-500/10",
    label: "text-red-600",
  },
  primary: { container: "", label: "text-white" }, // rendered via LinearGradient below
};

export function Button({ label, variant = "primary", loading, fullWidth, disabled, ...props }: ButtonProps) {
  const isDisabled = disabled || loading;
  const content = loading ? (
    <ActivityIndicator color="#fff" />
  ) : (
    <Text className={`text-sm font-semibold tracking-wide ${VARIANT_CLASSES[variant].label}`}>{label}</Text>
  );

  if (variant === "primary") {
    return (
      <Pressable accessibilityRole="button" disabled={isDisabled} className={fullWidth ? "w-full" : ""} {...props}>
        <LinearGradient
          colors={["#B8903F", "#7C5F26"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20, alignItems: "center", justifyContent: "center" },
            isDisabled ? { opacity: 0.5 } : BUTTON_SHADOW,
          ]}
        >
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`${fullWidth ? "w-full" : ""} rounded-md px-5 py-3 items-center justify-center ${
        isDisabled ? "opacity-50" : ""
      } ${VARIANT_CLASSES[variant].container}`}
      {...props}
    >
      {content}
    </Pressable>
  );
}
