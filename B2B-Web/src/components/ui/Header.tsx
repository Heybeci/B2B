import { Image, Text, View } from "react-native";
import { Link } from "expo-router";
import { useLanguage } from "../../i18n/LanguageContext";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Muted } from "./Typography";

function LogoMark() {
  return (
    <View className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-ink-900/10">
      <Image
        source={require("../../../assets/login-logo.jpg")}
        style={{ width: 40, height: 40, opacity: 1 }}
        resizeMode="cover"
        fadeDuration={0}
      />
    </View>
  );
}

export function PublicHeader() {
  const { t } = useLanguage();

  return (
    <View className="flex-row items-center justify-between px-6 py-4 border-b border-ink-900/10 bg-transparent">
      <Link href="/">
        <View className="flex-row items-center gap-3">
          <LogoMark />
          <View>
            <Text className="text-ink-900 font-serif text-base font-semibold leading-tight">Stone Group</Text>
            <Muted className="uppercase tracking-[1.5px] text-[10px]">{t("header.tagline")}</Muted>
          </View>
        </View>
      </Link>
      <LanguageSwitcher />
    </View>
  );
}
