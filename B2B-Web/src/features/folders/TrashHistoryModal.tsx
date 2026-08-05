import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { RestoreIcon, TrashIcon } from "../../components/ui/IconGlyphs";
import { Tooltip } from "../../components/ui/Tooltip";
import { Muted, SectionTitle } from "../../components/ui/Typography";
import { useAuth } from "../auth/AuthContext";
import { useLanguage, type TranslateFn } from "../../i18n/LanguageContext";
import type { Locale } from "../../i18n/translations";
import { ROW_SHADOW } from "../../theme/glass";
import type { ChangeHistoryDto } from "../hotels/types";
import { PERMISSIONS } from "../rolePermissions/hooks";
import { resolveFolderName } from "./folderName";
import {
  useChangeHistory,
  usePurgeFile,
  usePurgeFolder,
  useRestoreFile,
  useRestoreFolder,
  useTrash,
  useUndoChange,
} from "./hooks";

const DATE_LOCALE_TAGS: Record<Locale, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  ru: "ru-RU",
};

type Tab = "trash" | "history";

interface TrashHistoryModalProps {
  visible: boolean;
  onClose: () => void;
  hotelId: number;
}

// One shared row shape for both tabs — name/description on the left, a
// small icon action cluster on the right. Same skeleton as UploadProgressModal's
// list rows (ROW_SHADOW, no explicit background — it sits directly on the
// surrounding Card's own bg-paper/90).
function TrashHistoryRow({
  primary,
  meta,
  actionLabel,
  onAction,
  actionDisabled,
  secondaryLabel,
  onSecondary,
  secondaryDisabled,
}: {
  primary: string;
  meta: string;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryDisabled?: boolean;
}) {
  return (
    <View className="flex-row items-center gap-2 p-2 rounded-lg" style={[ROW_SHADOW]}>
      <View className="flex-1">
        <Muted numberOfLines={2} className="text-ink-800" style={{ fontWeight: "600" }}>
          {primary}
        </Muted>
        <Muted className="text-[11px]">{meta}</Muted>
      </View>
      <Tooltip label={actionLabel}>
        <Pressable
          onPress={onAction}
          disabled={actionDisabled}
          className="w-7 h-7 rounded-full bg-white/90 items-center justify-center"
          style={actionDisabled ? { opacity: 0.5 } : undefined}
        >
          <RestoreIcon />
        </Pressable>
      </Tooltip>
      {secondaryLabel && onSecondary ? (
        <Tooltip label={secondaryLabel}>
          <Pressable
            onPress={onSecondary}
            disabled={secondaryDisabled}
            className="w-7 h-7 rounded-full bg-white/90 items-center justify-center"
            style={secondaryDisabled ? { opacity: 0.5 } : undefined}
          >
            <TrashIcon color="#dc2626" />
          </Pressable>
        </Tooltip>
      ) : null}
    </View>
  );
}

// Describes a history row's change in plain text. Move rows never attempt to
// name the destination folder — the backend intentionally doesn't resolve
// that (see B2B.API's ChangeHistoryDto contract), so this stays scoped to
// "moved" + who/when, same as the row's own meta line already carries.
function describeHistoryRow(row: ChangeHistoryDto, locale: Locale, t: TranslateFn): string {
  if (row.changeType === "Move") {
    return t("trash.moved");
  }
  if (row.entityType === "Folder") {
    const previous = resolveFolderName(
      {
        nameTr: row.previousNameTr ?? "",
        nameEn: row.previousNameEn,
        nameDe: row.previousNameDe,
        nameRu: row.previousNameRu,
      },
      locale,
    );
    const current =
      row.currentNameTr !== null
        ? resolveFolderName(
            {
              nameTr: row.currentNameTr,
              nameEn: row.currentNameEn,
              nameDe: row.currentNameDe,
              nameRu: row.currentNameRu,
            },
            locale,
          )
        : t("trash.purgedNote");
    return t("trash.renamed", { previous, current });
  }
  const previous = row.previousOriginalName ?? "";
  const current = row.currentOriginalName ?? t("trash.purgedNote");
  return t("trash.renamed", { previous, current });
}

// Real RN Modal, same backdrop+Card skeleton as UploadProgressModal/
// FolderPickerModal — this list can run longer than either of those two, so
// the Card uses a slightly taller cap (max-h-[32rem] vs. their max-h-96)
// while keeping the same centered max-w-sm shape (this codebase has no true
// full-screen modal pattern). Two tabs via plain Button toggles — no Tabs
// primitive exists here, and one isn't worth adding for a single modal.
export function TrashHistoryModal({ visible, onClose, hotelId }: TrashHistoryModalProps) {
  const { t, locale } = useLanguage();
  const { user } = useAuth();
  const canPurge = user?.permissions.includes(PERMISSIONS.HotelsDelete) ?? false;

  const [tab, setTab] = useState<Tab>("trash");
  const [pendingPurge, setPendingPurge] = useState<{ type: "folder" | "file"; id: number; name: string } | null>(
    null,
  );

  // Queries only run while the modal is actually open — same `enabled`
  // shape useBrowseHotel already uses for its own lazy-fetch tree nodes.
  const trash = useTrash(hotelId, visible);
  const history = useChangeHistory(hotelId, visible);
  const restoreFolder = useRestoreFolder(hotelId);
  const restoreFile = useRestoreFile(hotelId);
  const purgeFolder = usePurgeFolder(hotelId);
  const purgeFile = usePurgeFile(hotelId);
  const undoChange = useUndoChange(hotelId);

  const formatDate = (iso: string) => new Date(iso).toLocaleString(DATE_LOCALE_TAGS[locale]);

  const folders = trash.data?.folders ?? [];
  const files = trash.data?.files ?? [];
  const historyRows = history.data ?? [];
  const purging = purgeFolder.isPending || purgeFile.isPending;

  const confirmPurge = () => {
    if (!pendingPurge) return;
    if (pendingPurge.type === "folder") {
      purgeFolder.mutate(pendingPurge.id, { onSuccess: () => setPendingPurge(null) });
    } else {
      purgeFile.mutate(pendingPurge.id, { onSuccess: () => setPendingPurge(null) });
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View className="flex-1 items-center justify-center bg-black/40 px-4">
          <Card className="p-5 gap-4 max-w-sm w-full max-h-[32rem] flex-col">
            <SectionTitle>{t("trash.modalTitle")}</SectionTitle>

            <View className="flex-row gap-2">
              <Button
                label={t("trash.tabTrash")}
                variant={tab === "trash" ? "secondary" : "ghost"}
                onPress={() => setTab("trash")}
              />
              <Button
                label={t("trash.tabHistory")}
                variant={tab === "history" ? "secondary" : "ghost"}
                onPress={() => setTab("history")}
              />
            </View>

            <ScrollView className="flex-1" contentContainerClassName="gap-1.5">
              {tab === "trash" ? (
                trash.isLoading ? (
                  <Muted>{t("common.loading")}</Muted>
                ) : folders.length === 0 && files.length === 0 ? (
                  <Muted>{t("trash.emptyTrash")}</Muted>
                ) : (
                  <>
                    {folders.map((folder) => {
                      const name = resolveFolderName(folder, locale);
                      return (
                        <TrashHistoryRow
                          key={`folder-${folder.id}`}
                          primary={name}
                          meta={t("trash.meta", { name: folder.deletedByDisplayName, date: formatDate(folder.deletedAt) })}
                          actionLabel={t("trash.restoreTooltip")}
                          onAction={() => restoreFolder.mutate(folder.id)}
                          actionDisabled={restoreFolder.isPending}
                          secondaryLabel={canPurge ? t("trash.purgeTooltip") : undefined}
                          onSecondary={canPurge ? () => setPendingPurge({ type: "folder", id: folder.id, name }) : undefined}
                          secondaryDisabled={purging}
                        />
                      );
                    })}
                    {files.map((file) => (
                      <TrashHistoryRow
                        key={`file-${file.id}`}
                        primary={file.originalName}
                        meta={t("trash.meta", { name: file.deletedByDisplayName, date: formatDate(file.deletedAt) })}
                        actionLabel={t("trash.restoreTooltip")}
                        onAction={() => restoreFile.mutate(file.id)}
                        actionDisabled={restoreFile.isPending}
                        secondaryLabel={canPurge ? t("trash.purgeTooltip") : undefined}
                        onSecondary={
                          canPurge ? () => setPendingPurge({ type: "file", id: file.id, name: file.originalName }) : undefined
                        }
                        secondaryDisabled={purging}
                      />
                    ))}
                  </>
                )
              ) : history.isLoading ? (
                <Muted>{t("common.loading")}</Muted>
              ) : historyRows.length === 0 ? (
                <Muted>{t("trash.emptyHistory")}</Muted>
              ) : (
                historyRows.map((row) => (
                  <TrashHistoryRow
                    key={row.id}
                    primary={describeHistoryRow(row, locale, t)}
                    meta={t("trash.meta", { name: row.changedByDisplayName, date: formatDate(row.changedAt) })}
                    actionLabel={t("trash.undoTooltip")}
                    onAction={() => undoChange.mutate(row.id)}
                    actionDisabled={undoChange.isPending}
                  />
                ))
              )}
            </ScrollView>

            <View className="flex-row gap-2 justify-end">
              <Button label={t("common.close")} variant="ghost" onPress={onClose} />
            </View>
          </Card>
        </View>
      </Modal>

      <ConfirmDialog
        visible={pendingPurge !== null}
        title={pendingPurge?.type === "folder" ? t("trash.purgeFolderTitle") : t("trash.purgeFileTitle")}
        message={
          pendingPurge?.type === "folder"
            ? t("trash.purgeFolderMessage", { name: pendingPurge?.name ?? "" })
            : t("trash.purgeFileMessage", { name: pendingPurge?.name ?? "" })
        }
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        loading={purging}
        onCancel={() => setPendingPurge(null)}
        onConfirm={confirmPurge}
      />
    </>
  );
}
