import { Pressable, Text, View } from "react-native";
import { useLanguage } from "../../i18n/LanguageContext";
import { LOCALES } from "../../i18n/translations";

// Flag emoji rather than image assets — no new files to ship, and flag
// emoji render natively across every modern browser/OS this app targets.
export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <View className="flex-row items-center gap-1">
      {LOCALES.map((option) => (
        <Pressable
          key={option.code}
          onPress={() => setLocale(option.code)}
          accessibilityLabel={option.label}
          hitSlop={4}
          className={`w-8 h-8 rounded-full items-center justify-center border ${
            locale === option.code ? "border-brass-400 bg-brass-400/15" : "border-transparent"
          }`}
        >
          <Text style={{ fontSize: 16, lineHeight: 20 }}>{option.flag}</Text>
        </Pressable>
      ))}
    </View>
  );
}
