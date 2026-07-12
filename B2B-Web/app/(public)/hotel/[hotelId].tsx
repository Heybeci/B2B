import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { FolderBrowser } from "../../../src/features/folders/FolderBrowser";

export default function HotelScreen() {
  const { hotelId, folderId } = useLocalSearchParams<{ hotelId: string; folderId?: string }>();

  return (
    <View className="flex-1 px-6 py-6">
      <FolderBrowser
        hotelId={Number(hotelId)}
        folderId={folderId ? Number(folderId) : null}
        boundedHeight
        onNavigate={(nextFolderId) =>
          router.setParams({ folderId: nextFolderId ? String(nextFolderId) : undefined })
        }
      />
    </View>
  );
}
