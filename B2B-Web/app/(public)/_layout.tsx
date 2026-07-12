import { View } from "react-native";
import { Slot, usePathname } from "expo-router";
import { Footer } from "../../src/components/ui/Footer";
import { GlassBackground } from "../../src/components/ui/GlassBackground";
import { PublicHeader } from "../../src/components/ui/Header";
import { HotelPanel } from "../../src/features/hotels/HotelPanel";
import { useHotels } from "../../src/features/hotels/hooks";

export default function PublicLayout() {
  const { data: hotels } = useHotels();
  // useLocalSearchParams doesn't reliably re-run in a layout when a Link
  // navigates between sibling instances of the same dynamic route (e.g.
  // /hotel/2 -> /hotel/3) — the sidebar's "active" state would stay stuck
  // on the previous hotel. Deriving it from the pathname (already the
  // pattern used for admin nav highlighting) always reflects the real URL.
  const pathname = usePathname();
  const hotelIdMatch = pathname.match(/^\/hotel\/(\d+)/);
  const selectedHotelId = hotelIdMatch ? Number(hotelIdMatch[1]) : undefined;

  return (
    <GlassBackground>
      <View className="flex-1">
        <View className="flex-1 lg:flex-row">
          <HotelPanel hotels={hotels ?? []} selectedHotelId={selectedHotelId} />
          <View className="flex-1">
            <PublicHeader />
            <Slot />
          </View>
        </View>
        <Footer />
      </View>
    </GlassBackground>
  );
}
