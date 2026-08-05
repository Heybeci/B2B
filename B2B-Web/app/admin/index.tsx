import { useState } from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { Link } from "expo-router";
import { Button } from "../../src/components/ui/Button";
import { Card } from "../../src/components/ui/Card";
import { CameraIcon } from "../../src/components/ui/IconGlyphs";
import { Body, Heading, Muted } from "../../src/components/ui/Typography";
import { useAuth } from "../../src/features/auth/AuthContext";
import { EditHotelModal } from "../../src/features/hotels/EditHotelModal";
import { hotelLogoUrl, useAdminHotels, useDeleteHotel } from "../../src/features/hotels/hooks";
import { PERMISSIONS } from "../../src/features/rolePermissions/hooks";
import { useLanguage } from "../../src/i18n/LanguageContext";
import { useGridColumns } from "../../src/lib/useGridColumns";

// Same pure-CSS percentage grid as the hotel folder/file grid — 5 columns
// on desktop, stepping down to 2/3/4 on narrower screens.
const GUTTER = 12; // half of the 24px visual gap on each side of a card

export default function AdminHotelsScreen() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: hotels, isLoading } = useAdminHotels();
  const deleteHotel = useDeleteHotel();
  const [columns, onGridLayout] = useGridColumns();
  const canManage = user?.permissions.includes(PERMISSIONS.HotelsManage) ?? false;
  const canDelete = user?.permissions.includes(PERMISSIONS.HotelsDelete) ?? false;
  const canPublish = user?.permissions.includes(PERMISSIONS.HotelsPublish) ?? false;
  const [editingHotelId, setEditingHotelId] = useState<number | null>(null);

  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-6">
      <View className="flex-row items-center justify-between">
        <Heading>{t("admin.nav.hotels")}</Heading>
        {canManage ? (
          <Link href="/admin/hotels/new" asChild>
            <Button label={t("hotelList.newHotel")} />
          </Link>
        ) : null}
      </View>

      {isLoading ? (
        <Muted>{t("common.loading")}</Muted>
      ) : (
        <View className="flex-row flex-wrap" style={{ marginHorizontal: -GUTTER }} onLayout={onGridLayout}>
          {hotels?.map((hotel) => (
            <View key={hotel.id} style={{ width: `${100 / columns}%`, padding: GUTTER }}>
              <Card className="p-4 gap-3 w-full">
                <Link href={{ pathname: "/admin/hotels/[hotelId]", params: { hotelId: String(hotel.id) } }}>
                  <View className="w-full aspect-square rounded-xl overflow-hidden bg-white items-center justify-center">
                    {hotelLogoUrl(hotel) ? (
                      <Image source={{ uri: hotelLogoUrl(hotel)! }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <Muted className="text-ink-500">{t("editHotel.noLogo")}</Muted>
                    )}
                  </View>
                  <Body className="text-ink-900 font-medium text-base mt-2" numberOfLines={1}>
                    {hotel.name}dfgfdggfd
                  </Body>
                </Link>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <Muted>{hotel.isPublished ? t("hotelList.published") : t("hotelList.draft")}</Muted>
                    {hotel.photoCount > 0 ? (
                      <>
                        <Muted className="text-ink-300">·</Muted>
                        <View className="flex-row items-center gap-1">
                          <CameraIcon color="#6B6252" />
                          <Muted>{t("hotelList.photoCount", { count: hotel.photoCount })}</Muted>
                        </View>
                      </>
                    ) : null}
                  </View>
                  <View className="flex-row items-center gap-3">
                    {canManage ? (
                      <Pressable onPress={() => setEditingHotelId(hotel.id)}>
                        <Muted className="text-brass-700">{t("common.edit")}</Muted>
                      </Pressable>
                    ) : null}
                    {canDelete ? (
                      <Pressable onPress={() => deleteHotel.mutate(hotel.id)}>
                        <Muted className="text-red-600">{t("common.delete")}</Muted>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </Card>
            </View>
          ))}
        </View>
      )}

      <EditHotelModal
        hotelId={editingHotelId}
        onClose={() => setEditingHotelId(null)}
        canPublish={canPublish}
      />
    </ScrollView>
  );
}
