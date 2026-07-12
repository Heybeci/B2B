import { forwardRef } from "react";
import { Text, TextInput, View, type TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, className = "", ...props },
  ref,
) {
  return (
    <View className="gap-1.5">
      {label ? <Text className="text-xs font-semibold uppercase tracking-wide text-ink-600">{label}</Text> : null}
      <TextInput
        ref={ref}
        placeholderTextColor="#8C8271"
        className={`border rounded-lg px-3.5 py-3 text-sm text-ink-900 bg-paper ${
          error ? "border-red-500/50" : "border-ink-900/15"
        } ${className}`}
        {...props}
      />
      {error ? <Text className="text-xs text-red-600">{error}</Text> : null}
    </View>
  );
});
