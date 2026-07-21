import { ActivityIndicator, Modal, ScrollView, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { CheckIcon, ErrorIcon } from "../../components/ui/IconGlyphs";
import { Muted, SectionTitle } from "../../components/ui/Typography";
import { useLanguage } from "../../i18n/LanguageContext";
import { ROW_SHADOW } from "../../theme/glass";
import { type UploadProgressItem } from "./dragDropUpload";

interface UploadProgressModalProps {
  visible: boolean;
  items: UploadProgressItem[];
  finished: boolean;
  onClose: () => void;
}

// Live progress list for a drag-drop upload — every folder/file involved in
// the drop shows up immediately as "pending" and updates in place as it's
// processed, instead of the old single static "uploading…" label that made
// large-folder uploads look stuck even when they were still working. Same
// Modal → dim backdrop → Card → SectionTitle → ScrollView skeleton as
// FolderPickerModal. Closing the modal doesn't cancel the upload — it just
// hides the dialog, the upload keeps running in AdminFolderToolbar's state.
export function UploadProgressModal({ visible, items, finished, onClose }: UploadProgressModalProps) {
  const { t } = useLanguage();

  const done = items.filter((i) => i.status === "done").length;
  const total = items.length;
  const failed = items.filter((i) => i.status === "error").length;

  const renderStatusIcon = (status: UploadProgressItem["status"]) => {
    switch (status) {
      case "pending":
        return <View className="w-3 h-3 rounded-full border border-ink-300" />;
      case "uploading":
        return <ActivityIndicator size="small" color="#B8903F" />;
      case "done":
        return <CheckIcon color="#22c55e" />;
      case "error":
        return <ErrorIcon color="#ef4444" />;
      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/40 px-4">
        <Card className="p-5 gap-4 max-w-sm w-full max-h-96 flex-col">
          <SectionTitle>{t("upload.progressTitle")}</SectionTitle>

          <View className="gap-1">
            <Muted className="text-sm">{t("upload.progressSummary", { done, total })}</Muted>
            {failed > 0 ? (
              <Muted className="text-sm text-red-600">{t("upload.progressFailed", { failed })}</Muted>
            ) : null}
          </View>

          <ScrollView className="max-h-72 flex-1" contentContainerClassName="gap-1.5">
            {items.map((item) => (
              <View
                key={item.id}
                className="flex-row items-center gap-2 p-2 rounded-lg"
                style={[ROW_SHADOW]}
              >
                <View className="w-4 items-center justify-center flex-shrink-0">
                  {renderStatusIcon(item.status)}
                </View>
                <View className="flex-1" style={{ marginLeft: Math.max(0, (item.path.length - 1) * 8) }}>
                  <Muted className="text-xs" numberOfLines={1}>
                    {item.name}
                  </Muted>
                  {item.status === "error" && item.error ? (
                    <Muted className="text-xs text-red-600" numberOfLines={1}>
                      {item.error}
                    </Muted>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>

          <View className="flex-row gap-2 justify-end items-center">
            {!finished ? <ActivityIndicator size="small" color="#B8903F" /> : null}
            <Button label={t("common.close")} variant="ghost" onPress={onClose} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
