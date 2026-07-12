import { Text, type TextProps } from "react-native";

export function Heading({ className = "", ...props }: TextProps & { className?: string }) {
  return <Text className={`font-serif text-2xl text-ink-900 ${className}`} {...props} />;
}

export function SectionTitle({ className = "", ...props }: TextProps & { className?: string }) {
  return (
    <Text
      className={`text-xs font-semibold uppercase tracking-[2px] text-brass-600 ${className}`}
      {...props}
    />
  );
}

export function Body({ className = "", ...props }: TextProps & { className?: string }) {
  return <Text className={`text-sm text-ink-700 ${className}`} {...props} />;
}

export function Muted({ className = "", ...props }: TextProps & { className?: string }) {
  return <Text className={`text-xs text-ink-500 ${className}`} {...props} />;
}
