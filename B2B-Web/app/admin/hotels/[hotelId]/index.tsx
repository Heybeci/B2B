import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Heading, Muted } from "../../../../src/components/ui/Typography";
import { useAuth } from "../../../../src/features/auth/AuthContext";
import { AdminFolderToolbar } from "../../../../src/features/folders/AdminFolderToolbar";
import { FolderBrowser } from "../../../../src/features/folders/FolderBrowser";
import { useHotel } from "../../../../src/features/hotels/hooks";
import { useLanguage } from "../../../../src/i18n/LanguageContext";
import { PERMISSIONS } from "../../../../src/features/rolePermissions/hooks";

// Editing a hotel's own details (name/description/logo/publish state) now
// happens via a modal from its card on the admin hotel list — this page is
// reached by clicking into that card and is purely "manage this hotel's
// files", so it stays focused on the folder tree and uploads.
export default function AdminHotelDetailScreen() {
  const { hotelId: hotelIdParam, folderId: folderIdParam } = useLocalSearchParams<{
    hotelId: string;
    folderId?: string;
  }>();
  const hotelId = Number(hotelIdParam);
  const folderId = folderIdParam ? Number(folderIdParam) : null;

  const { user } = useAuth();
  const { t } = useLanguage();
  const canManage = user?.permissions.includes(PERMISSIONS.HotelsManage) ?? false;

  const { data: hotel } = useHotel(hotelId);

  if (!hotel) return <Muted>{t("common.loading")}</Muted>;

  return (
    <View className="flex-1 min-h-0 gap-4">
      <Heading>{hotel.name}</Heading>

      <FolderBrowser
        hotelId={hotelId}
        folderId={folderId}
        isAdmin={canManage}
        boundedHeight
        belowHeaderContent={
          <Muted>{hotel.isPublished ? t("hotelList.published") : t("hotelList.draft")}</Muted>
        }
        onNavigate={(next) => router.setParams({ folderId: next ? String(next) : undefined })}
        adminToolbar={
          canManage ? (
            <AdminFolderToolbar
              hotelId={hotelId}
              folderId={folderId}
              onFolderDeleted={() => router.setParams({ folderId: undefined })}
            />
          ) : undefined
        }
      />
    </View>
  );
}
