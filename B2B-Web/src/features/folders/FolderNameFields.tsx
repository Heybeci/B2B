import { View } from "react-native";
import { Input } from "../../components/ui/Input";
import { useLanguage } from "../../i18n/LanguageContext";
import { LOCALES } from "../../i18n/translations";
import type { FolderNames } from "./folderName";

interface FolderNameFieldsProps {
  value: FolderNames;
  onChange: (next: FolderNames) => void;
  disabled?: boolean;
}

export function FolderNameFields({ value, onChange, disabled }: FolderNameFieldsProps) {
  const { t } = useLanguage();
  const fieldKey = { tr: "nameTr", en: "nameEn", de: "nameDe", ru: "nameRu" } as const;

  return (
    <View className="gap-2">
      {LOCALES.map(({ code, label }) => (
        <Input
          key={code}
          label={code === "tr" ? `${label} *` : label}
          value={value[fieldKey[code]] ?? ""}
          onChangeText={(text) =>
            onChange({
              ...value,
              [fieldKey[code]]: code === "tr" ? text : text || null,
            })
          }
          placeholder={t("folder.namePlaceholder")}
          editable={!disabled}
        />
      ))}
    </View>
  );
}
