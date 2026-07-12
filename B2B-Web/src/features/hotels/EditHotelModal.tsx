import { useEffect, useState } from "react";
import { Image, Modal, Pressable, Switch, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Muted, SectionTitle } from "../../components/ui/Typography";
import { useLanguage } from "../../i18n/LanguageContext";
import { apiClient } from "../../lib/api/client";
import { appendFileToFormData } from "../../lib/upload/appendFile";
import { hotelLogoUrl, useHotel, useUpdateHotel } from "./hooks";

interface EditHotelModalProps {
  // null = closed. Kept as a single prop (rather than a separate `visible`
  // boolean) so the modal always knows which hotel it's editing without a
  // stale id lingering after close.
  hotelId: number | null;
  onClose: () => void;
  canPublish: boolean;
}

// Triggered from a hotel card on the admin list (not from the hotel's own
// content page anymore) — editing name/description/logo/publish state here
// keeps that off the content page entirely, so clicking into a hotel there
// is unambiguously "go manage its files", not "edit its details".
export function EditHotelModal({ hotelId, onClose, canPublish }: EditHotelModalProps) {
  const { t } = useLanguage();
  const { data: hotel } = useHotel(hotelId ?? undefined);
  const updateHotel = useUpdateHotel(hotelId ?? 0);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [sortOrder, setSortOrder] = useState("0");
  const [logoUploading, setLogoUploading] = useState(false);

  useEffect(() => {
    if (hotel) {
      setName(hotel.name);
      setDescription(hotel.description ?? "");
      setIsPublished(hotel.isPublished ?? true);
      setSortOrder(String(hotel.sortOrder ?? 0));
    }
  }, [hotel]);

  const saveDetails = () => {
    updateHotel.mutate(
      { name, description, isPublished, sortOrder: Number(sortOrder) || 0 },
      { onSuccess: onClose },
    );
  };

  const replaceLogo = async () => {
    if (!hotelId) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.9 });
    if (result.canceled) return;
    setLogoUploading(true);
    try {
      const form = new FormData();
      await appendFileToFormData(form, "logo", {
        uri: result.assets[0].uri,
        name: result.assets[0].fileName ?? "logo.jpg",
        mimeType: result.assets[0].mimeType,
      });
      await apiClient.post(`/hotels/${hotelId}/logo`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateHotel.mutate({});
    } finally {
      setLogoUploading(false);
    }
  };

  return (
    <Modal visible={hotelId !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/50 px-4">
        {!hotel ? (
          <Card className="p-6">
            <Muted>{t("common.loading")}</Muted>
          </Card>
        ) : (
          <Card className="p-5 gap-4 w-full max-w-lg">
            <View className="flex-row items-center justify-between">
              <SectionTitle>{t("editHotel.title")}</SectionTitle>
              <Pressable onPress={onClose} hitSlop={8}>
                <Muted className="text-ink-500">{t("common.close")} ✕</Muted>
              </Pressable>
            </View>

            <View className="flex-row gap-4 items-start">
              <View className="items-center gap-2">
                <View className="w-20 h-20 rounded-md bg-ink-50 items-center justify-center overflow-hidden">
                  {hotelLogoUrl(hotel) ? (
                    <Image source={{ uri: hotelLogoUrl(hotel)! }} className="w-full h-full" resizeMode="contain" />
                  ) : (
                    <Muted className="text-ink-500 text-[10px]">{t("editHotel.noLogo")}</Muted>
                  )}
                </View>
                <Button label={t("editHotel.changeLogo")} variant="secondary" loading={logoUploading} onPress={replaceLogo} />
              </View>
              <View className="flex-1 gap-3">
                <Input label={t("editHotel.name")} value={name} onChangeText={setName} />
                <Input label={t("editHotel.description")} value={description} onChangeText={setDescription} multiline />
                <Input
                  label={t("editHotel.sortOrder")}
                  value={sortOrder}
                  onChangeText={setSortOrder}
                  keyboardType="numeric"
                  className="max-w-[120px]"
                />
                {canPublish ? (
                  <View className="flex-row items-center gap-2">
                    <Switch value={isPublished} onValueChange={setIsPublished} />
                    <Muted>{isPublished ? t("editHotel.published") : t("editHotel.draft")}</Muted>
                  </View>
                ) : null}
              </View>
            </View>

            <View className="flex-row justify-end gap-3">
              <Button label={t("common.cancel")} variant="ghost" onPress={onClose} />
              <Button label={t("common.save")} onPress={saveDetails} loading={updateHotel.isPending} />
            </View>
          </Card>
        )}
      </View>
    </Modal>
  );
}
