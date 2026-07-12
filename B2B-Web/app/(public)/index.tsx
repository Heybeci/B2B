import { Image, ScrollView, View } from "react-native";
import { Link } from "expo-router";
import { Card } from "../../src/components/ui/Card";
import { Heading, Muted, SectionTitle, Body } from "../../src/components/ui/Typography";
import { hotelLogoUrl, useHotels } from "../../src/features/hotels/hooks";
import { useLanguage } from "../../src/i18n/LanguageContext";
import { useGridColumns } from "../../src/lib/useGridColumns";

// Pure CSS percentage grid (classic gutter-via-padding technique) — every
// card gets an identical 1/N width from layout alone, no JS measurement or
// two-phase render, so there's no chance of cards settling at different
// sizes before a resize/layout pass catches up. Column count steps down on
// narrower screens (phone: 2, large phone: 3, tablet: 4, desktop: 5).
const GUTTER = 12; // half of the 24px visual gap on each side of a card

export default function PublicIndex() {
  const { data: hotels, isLoading } = useHotels();
  const columns = useGridColumns();
  const { t } = useLanguage();

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-6 py-10 gap-8">
      <View className="gap-3 max-w-2xl">
        <SectionTitle>{t("home.welcome")}</SectionTitle>
        <Heading className="text-3xl">{t("home.heading")}</Heading>
        <Body>{t("home.body")}</Body>
      </View>

      {isLoading ? (
        <Muted>{t("common.loading")}</Muted>
      ) : (
        <View className="flex-row flex-wrap" style={{ marginHorizontal: -GUTTER }}>
          {hotels?.map((hotel) => (
            <View key={hotel.id} style={{ width: `${100 / columns}%`, padding: GUTTER }}>
              <Link href={{ pathname: "/hotel/[hotelId]", params: { hotelId: String(hotel.id) } }}>
                <Card className="aspect-square p-3 w-full">
                  <View className="w-full h-full rounded-xl overflow-hidden bg-white items-center justify-center">
                    {hotelLogoUrl(hotel) ? (
                      <Image source={{ uri: hotelLogoUrl(hotel)! }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <Muted className="text-ink-500">{hotel.name}</Muted>
                    )}
                  </View>
                </Card>
              </Link>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
