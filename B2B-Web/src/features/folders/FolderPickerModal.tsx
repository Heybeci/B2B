import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, ScrollView, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Muted, SectionTitle } from "../../components/ui/Typography";
import { useLanguage } from "../../i18n/LanguageContext";
import { FolderPickerTree } from "./FolderPickerTree";

interface FolderPickerModalProps {
  visible: boolean;
  title: string;
  hotelId: number;
  // Set when moving a folder (excludes it + its subtree from the picker);
  // left unset when moving a file — any folder is a valid destination then.
  excludeFolderId?: number;
  onSelect: (folderId: number | null) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

// "Pick a destination folder" dialog — a real RN Modal (same portal-above-
// everything approach as AdminFolderToolbar's duplicate-file prompt and
// ConfirmDialog) wrapping the read-only FolderPickerTree. One component for
// both the move-folder and move-file flows; only `excludeFolderId` differs.
export function FolderPickerModal({
  visible,
  title,
  hotelId,
  excludeFolderId,
  onSelect: onConfirm,
  onCancel,
  loading,
  error,
}: FolderPickerModalProps) {
  const { t } = useLanguage();
  const [pendingId, setPendingId] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (!visible) {
      setPendingId(undefined);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/40 px-4">
        <Card className="p-5 gap-4 max-w-sm w-full">
          <SectionTitle>{title}</SectionTitle>
          <View className="relative">
            <ScrollView className="max-h-72" contentContainerClassName="gap-2">
              <FolderPickerTree
                hotelId={hotelId}
                excludeFolderId={excludeFolderId}
                disabled={loading}
                selectedFolderId={pendingId}
                onSelect={setPendingId}
              />
            </ScrollView>
            {loading ? (
              <View className="absolute inset-0 bg-white/60 items-center justify-center rounded-lg" />
            ) : null}
          </View>
          {error ? <Muted className="text-red-600">{error}</Muted> : null}
          <View className="flex-row gap-2 justify-end items-center">
            {loading ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#B8903F" />
                <Muted className="text-sm">{t("folder.moving")}</Muted>
              </View>
            ) : null}
            <Button label={t("common.cancel")} variant="ghost" onPress={onCancel} disabled={loading} />
            <Button
              label={t("common.ok")}
              variant="primary"
              onPress={() => {
                if (pendingId !== undefined) {
                  onConfirm(pendingId);
                }
              }}
              disabled={pendingId === undefined || loading}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
