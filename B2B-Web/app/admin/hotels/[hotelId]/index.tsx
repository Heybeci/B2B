import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { CameraIcon } from "../../../../src/components/ui/IconGlyphs";
import { Heading, Muted } from "../../../../src/components/ui/Typography";
import { useAuth } from "../../../../src/features/auth/AuthContext";
import { AdminFolderActions, AdminFolderDropzone, useAdminFolderToolbarState } from "../../../../src/features/folders/AdminFolderToolbar";
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
  const adminState = useAdminFolderToolbarState(hotelId, folderId, () => router.setParams({ folderId: undefined }));

  if (!hotel) return <Muted style={{ fontSize: 14.4, fontWeight: "600" }}>{t("common.loading")}</Muted>;

  return (
    <View className="flex-1 min-h-0 gap-4">
      {/* <Heading style={{ fontSize: 14.4, fontWeight: "600" }}>{hotel.name}</Heading> */}

      <FolderBrowser
        hotelId={hotelId}
        folderId={folderId}
        isAdmin={canManage}
        boundedHeight
        belowHeaderContent={
          <View className="flex-row items-center gap-2">
            <Muted style={{ fontSize: 14.4, fontWeight: "600" }}>{hotel.isPublished ? t("hotelList.published") : t("hotelList.draft")}</Muted>
            {hotel.photoCount > 0 ? (
              <>
                <Muted className="text-ink-300">·</Muted>
                <View className="flex-row items-center gap-1">
                  <CameraIcon color="#6B6252" />
                  <Muted style={{ fontSize: 14.4, fontWeight: "600" }}>{t("hotelList.photoCount", { count: hotel.photoCount })}</Muted>
                </View>
              </>
            ) : null}
          </View>
        }
        onNavigate={(next) => router.setParams({ folderId: next ? String(next) : undefined })}
        adminActions={canManage ? <AdminFolderActions state={adminState} /> : undefined}
        adminToolbar={canManage ? <AdminFolderDropzone state={adminState} /> : undefined}
      />
    </View>
  );
}
