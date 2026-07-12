import { useState } from "react";
import { Image, type LayoutChangeEvent, ScrollView, View } from "react-native";
import { Link } from "expo-router";
import { Card } from "../../components/ui/Card";
import { Body, Muted } from "../../components/ui/Typography";
import { ACTIVE_GLOW, BADGE_SHADOW, ROW_SHADOW } from "../../theme/glass";
import { hotelLogoUrl } from "./hooks";
import type { HotelDto } from "./types";

interface HotelPanelProps {
  hotels: HotelDto[];
  selectedHotelId?: number;
}

function LogoImage({ hotel }: { hotel: HotelDto }) {
  const logo = hotelLogoUrl(hotel);
  if (logo) {
    return <Image source={{ uri: logo }} className="w-full h-full" resizeMode="cover" />;
  }
  return (
    <View className="w-full h-full items-center justify-center bg-ink-50">
      <Muted className="text-[10px] text-ink-500">{hotel.name.slice(0, 2).toUpperCase()}</Muted>
    </View>
  );
}

// Wide screens: a row per hotel — small logo tile on the left, name to the
// right — all sized to the widest hotel name so every row lines up instead
// of each shrink-wrapping to its own (uneven) content width. Brass (not
// blue/sapphire) marks the active row, matching the app's one accent color
// for "selected" elsewhere (toggles, checked states).
function HotelRow({
  hotel,
  active,
  width,
  onLayout,
}: {
  hotel: HotelDto;
  active: boolean;
  width?: number;
  onLayout: (event: LayoutChangeEvent) => void;
}) {
  return (
    <Card
      className="flex-row items-center gap-3 p-2.5"
      onLayout={onLayout}
      // Card's base className already sets a border color; a className string
      // can't reliably override it since generated-stylesheet order (not JSX
      // order) decides the winner. Only an inline style is guaranteed to win.
      // Shadow is also overridden to ROW_SHADOW: Card's own default shadow is
      // sized for a single isolated card and pools into a dark seam between
      // rows when several sit stacked tight together, like this list.
      style={[
        ROW_SHADOW,
        width ? { width } : null,
        active ? { borderColor: "#B8903F", borderWidth: 2 } : null,
        active ? ACTIVE_GLOW : null,
      ]}
    >
      <View className="w-11 h-11 rounded-lg overflow-hidden bg-white shrink-0" style={BADGE_SHADOW}>
        <LogoImage hotel={hotel} />
      </View>
      <Body
        numberOfLines={1}
        className={`max-w-[170px] ${active ? "text-ink-900 font-semibold" : "text-ink-700"}`}
      >
        {hotel.name}
      </Body>
    </Card>
  );
}

// Narrow screens: same logo+name row, laid out horizontally as a scrollable
// strip of compact pills instead of a vertical list.
function HotelPill({ hotel, active }: { hotel: HotelDto; active: boolean }) {
  return (
    <View
      style={active ? ACTIVE_GLOW : null}
      className={`flex-row items-center gap-2 pl-1.5 pr-3 py-1.5 rounded-full border ${
        active ? "border-brass-400 border-[2px]" : "border-ink-900/15"
      } bg-white`}
    >
      <View className="w-8 h-8 rounded-md overflow-hidden bg-white shrink-0" style={BADGE_SHADOW}>
        <LogoImage hotel={hotel} />
      </View>
      <Body numberOfLines={1} className={`max-w-[140px] ${active ? "text-ink-900 font-semibold" : "text-ink-700"}`}>
        {hotel.name}
      </Body>
    </View>
  );
}

export function HotelPanel({ hotels, selectedHotelId }: HotelPanelProps) {
  // Each row first renders at its own natural (shrink-to-fit) width so we can
  // measure it, then every row is pinned to the widest one measured so far —
  // same uniform width for all, sized off whichever hotel name is longest,
  // rather than a guessed static value.
  const [rowWidths, setRowWidths] = useState<Record<number, number>>({});
  const measuredWidths = Object.values(rowWidths);
  const maxRowWidth = measuredWidths.length > 0 ? Math.max(...measuredWidths) : undefined;

  const handleRowLayout = (hotelId: number) => (event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    setRowWidths((prev) => (prev[hotelId] === width ? prev : { ...prev, [hotelId]: width }));
  };

  return (
    <>
      {/* Wide screens: fixed left sidebar, one row per hotel, scrolls if the list overflows */}
      <View className="hidden lg:flex lg:w-64 lg:border-r lg:border-ink-900/10">
        <ScrollView contentContainerClassName="p-4 gap-3 items-start">
          {hotels.map((hotel) => (
            <Link key={hotel.id} href={{ pathname: "/hotel/[hotelId]", params: { hotelId: String(hotel.id) } }}>
              <HotelRow
                hotel={hotel}
                active={hotel.id === selectedHotelId}
                width={maxRowWidth}
                onLayout={handleRowLayout(hotel.id)}
              />
            </Link>
          ))}
        </ScrollView>
      </View>

      {/* Narrow screens: horizontal strip up top */}
      <View className="flex lg:hidden border-b border-ink-900/10">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="p-3 gap-3 grow justify-center items-center"
        >
          {hotels.map((hotel) => (
            <Link key={hotel.id} href={{ pathname: "/hotel/[hotelId]", params: { hotelId: String(hotel.id) } }}>
              <HotelPill hotel={hotel} active={hotel.id === selectedHotelId} />
            </Link>
          ))}
        </ScrollView>
      </View>
    </>
  );
}
