import { useState } from "react";
import { Image, ScrollView, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { Button } from "../../../src/components/ui/Button";
import { Input } from "../../../src/components/ui/Input";
import { Heading, Muted } from "../../../src/components/ui/Typography";
import { useCreateHotel } from "../../../src/features/hotels/hooks";
import { useLanguage } from "../../../src/i18n/LanguageContext";
import { appendFileToFormData } from "../../../src/lib/upload/appendFile";

export default function NewHotelScreen() {
  const createHotel = useCreateHotel();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [logo, setLogo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
    });
    if (!result.canceled) {
      setLogo(result.assets[0]);
    }
  };

  const onSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError(t("newHotel.nameRequired"));
      return;
    }
    const form = new FormData();
    form.append("name", name.trim());
    if (description.trim()) form.append("description", description.trim());
    if (logo) {
      await appendFileToFormData(form, "logo", {
        uri: logo.uri,
        name: logo.fileName ?? "logo.jpg",
        mimeType: logo.mimeType,
      });
    }
    try {
      const hotel = await createHotel.mutateAsync(form);
      router.replace({ pathname: "/admin/hotels/[hotelId]", params: { hotelId: String(hotel.id) } });
    } catch {
      setError(t("newHotel.createFailed"));
    }
  };

  return (
    <ScrollView className="flex-1" contentContainerClassName="max-w-md gap-5">
      <Heading>{t("newHotel.title")}</Heading>
      <Input label={t("editHotel.name")} value={name} onChangeText={setName} />
      <Input label={t("newHotel.description")} value={description} onChangeText={setDescription} multiline />

      <View className="gap-2">
        <Muted>{t("newHotel.logo")}</Muted>
        {logo ? (
          <Image source={{ uri: logo.uri }} className="w-32 h-32 rounded-md bg-ink-50" resizeMode="contain" />
        ) : null}
        <Button
          label={logo ? t("newHotel.changeLogo") : t("newHotel.pickLogo")}
          variant="secondary"
          onPress={pickLogo}
        />
      </View>

      {error ? <Muted className="text-red-600">{error}</Muted> : null}
      <Button label={t("common.create")} onPress={onSubmit} loading={createHotel.isPending} />
    </ScrollView>
  );
}
