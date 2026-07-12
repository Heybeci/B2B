import { View, type ViewProps } from "react-native";
import { useLanguage } from "../../i18n/LanguageContext";
import { Muted } from "./Typography";

export function Footer({ className = "", ...props }: ViewProps & { className?: string }) {
  const { t } = useLanguage();

  return (
    <View className={`items-center border-t border-ink-900/10 py-3 ${className}`} {...props}>
      <Muted className="text-ink-400">{t("footer.copyright")}</Muted>
    </View>
  );
}
