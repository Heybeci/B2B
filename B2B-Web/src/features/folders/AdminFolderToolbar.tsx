import { useEffect, useRef, useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { useToast } from "../../components/ui/Toast";
import { Body, Muted, SectionTitle } from "../../components/ui/Typography";
import { useLanguage } from "../../i18n/LanguageContext";
import { appendFileToFormData } from "../../lib/upload/appendFile";
import { emptyFolderNames, type FolderNames } from "./folderName";
import { FolderNameFields } from "./FolderNameFields";
import { type ConflictChoice, type UploadProgressItem, uploadDroppedItems } from "./dragDropUpload";
import { useCreateFolder, useDeleteFolder, useGenerateWebOptimizedImages, useUploadFiles } from "./hooks";
import { TrashHistoryModal } from "./TrashHistoryModal";
import { UploadProgressModal } from "./UploadProgressModal";

// Shared state/logic behind the two visual pieces below: the action-buttons
// row (rendered next to the "Seç" select-mode toggle, in FolderBrowser's
// header) and the drag-and-drop dropzone (rendered further down the page,
// now upload-only — see plan.md 2026-08-03 note on this split). Both pieces
// are mounted from the same parent screen instance, so they share one call
// to this hook rather than each re-deriving their own state.
function useAdminFolderToolbar(hotelId: number, folderId: number | null, onFolderDeleted: () => void) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const createFolder = useCreateFolder(hotelId, folderId);
  const deleteFolder = useDeleteFolder(hotelId, folderId);
  const uploadFiles = useUploadFiles(hotelId, folderId);
  const generateWebOptimized = useGenerateWebOptimizedImages(hotelId, folderId);

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderNames, setNewFolderNames] = useState<FolderNames>(emptyFolderNames());
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [conflictPrompt, setConflictPrompt] = useState<{
    count: number;
    resolve: (choice: ConflictChoice) => void;
  } | null>(null);
  const [uploadItems, setUploadItems] = useState<UploadProgressItem[]>([]);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadFinished, setUploadFinished] = useState(false);
  const [trashModalVisible, setTrashModalVisible] = useState(false);
  const dropZoneRef = useRef<View>(null);

  const submitNewFolder = async () => {
    if (!newFolderNames.nameTr.trim()) return;
    await createFolder.mutateAsync(newFolderNames);
    setNewFolderNames(emptyFolderNames());
    setCreatingFolder(false);
  };

  // Backfills web-optimized (~1920px) copies for images already in this
  // folder — new uploads get one automatically from now on (see plan.md), so
  // this button only matters for pre-existing images. Result is summarized
  // in a toast; nothing in the visible file grid changes (see hooks.ts).
  const handleGenerateWebOptimized = async () => {
    try {
      const result = await generateWebOptimized.mutateAsync();
      if (result.totalImages === 0) {
        showToast(t("webOptimize.noImages"), "success");
      } else if (result.processed === 0 && result.failed === 0) {
        showToast(t("webOptimize.allUpToDate"), "success");
      } else if (result.failed > 0) {
        showToast(t("webOptimize.successWithFailed", { processed: result.processed, failed: result.failed }), "error");
      } else {
        showToast(t("webOptimize.success", { processed: result.processed }), "success");
      }
    } catch {
      showToast(t("webOptimize.error"), "error");
    }
  };

  const pickAndUpload = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 0.9,
    });
    if (result.canceled || result.assets.length === 0) return;
    const form = new FormData();
    if (folderId) form.append("folderId", String(folderId));
    for (const asset of result.assets) {
      await appendFileToFormData(form, "files", {
        uri: asset.uri,
        name: asset.fileName ?? `file-${Date.now()}`,
        mimeType: asset.mimeType,
      });
    }
    await uploadFiles.mutateAsync(form);
  };

  // Drag-and-drop is web-only (folder traversal relies on the browser's
  // FileSystemEntry API, which has no native-app equivalent), wired via a
  // direct DOM ref + addEventListener rather than RN props, since React
  // Native Web's <View> doesn't expose onDrop/onDragOver as component props.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const node = dropZoneRef.current as unknown as HTMLElement | null;
    if (!node) return;

    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    };
    const onDragLeave = (e: DragEvent) => {
      if (e.currentTarget === e.target) setIsDragOver(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (!e.dataTransfer) return;
      setDropping(true);
      setUploadItems([]);
      setUploadFinished(false);
      setUploadModalVisible(true);
      uploadDroppedItems({
        hotelId,
        targetFolderId: folderId,
        dataTransfer: e.dataTransfer,
        confirmConflicts: (count) =>
          new Promise<ConflictChoice>((resolve) => setConflictPrompt({ count, resolve })),
        onProgress: setUploadItems,
        t,
      })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["hotels", hotelId] });
        })
        .catch((err) => console.error(err))
        .finally(() => {
          setDropping(false);
          setUploadFinished(true);
        });
    };

    node.addEventListener("dragover", onDragOver);
    node.addEventListener("dragleave", onDragLeave);
    node.addEventListener("drop", onDrop);
    return () => {
      node.removeEventListener("dragover", onDragOver);
      node.removeEventListener("dragleave", onDragLeave);
      node.removeEventListener("drop", onDrop);
    };
  }, [hotelId, folderId, queryClient, t]);

  return {
    t,
    hotelId,
    folderId,
    onFolderDeleted,
    createFolder,
    deleteFolder,
    uploadFiles,
    generateWebOptimized,
    creatingFolder,
    setCreatingFolder,
    newFolderNames,
    setNewFolderNames,
    isDragOver,
    dropping,
    dropZoneRef,
    conflictPrompt,
    setConflictPrompt,
    uploadItems,
    uploadModalVisible,
    setUploadModalVisible,
    uploadFinished,
    trashModalVisible,
    setTrashModalVisible,
    submitNewFolder,
    handleGenerateWebOptimized,
    pickAndUpload,
  };
}

export type AdminFolderToolbarState = ReturnType<typeof useAdminFolderToolbar>;

export function useAdminFolderToolbarState(
  hotelId: number,
  folderId: number | null,
  onFolderDeleted: () => void,
): AdminFolderToolbarState {
  return useAdminFolderToolbar(hotelId, folderId, onFolderDeleted);
}

// Non-upload actions (new folder / web-optimize backfill / trash / delete
// this folder) — rendered next to the "Seç" select-mode toggle in
// FolderBrowser's header row, not inside the dropzone box (see
// AdminFolderDropzone below).
export function AdminFolderActions({ state }: { state: AdminFolderToolbarState }) {
  const { t } = state;
  return (
    <>
      <View className="flex-row flex-wrap items-center gap-3">
        <Button
          label={t("upload.newFolder")}
          variant="secondary"
          onPress={() => state.setCreatingFolder((v) => !v)}
        />
        <Button
          label={t("webOptimize.button")}
          variant="secondary"
          loading={state.generateWebOptimized.isPending}
          onPress={state.handleGenerateWebOptimized}
        />
        <Button label={t("trash.openButton")} variant="secondary" onPress={() => state.setTrashModalVisible(true)} />
        {state.folderId ? (
          <Pressable
            onPress={async () => {
              await state.deleteFolder.mutateAsync(state.folderId as number);
              state.onFolderDeleted();
            }}
          >
            <Muted className="text-red-600">{t("upload.deleteThisFolder")}</Muted>
          </Pressable>
        ) : null}
      </View>

      {state.creatingFolder ? (
        <View className="gap-3 mt-3">
          <FolderNameFields value={state.newFolderNames} onChange={state.setNewFolderNames} />
          <View className="flex-row gap-2 justify-end">
            <Button
              label={t("common.cancel")}
              variant="ghost"
              onPress={() => {
                state.setCreatingFolder(false);
                state.setNewFolderNames(emptyFolderNames());
              }}
            />
            <Button
              label={t("upload.add")}
              onPress={state.submitNewFolder}
              loading={state.createFolder.isPending}
              disabled={!state.newFolderNames.nameTr.trim()}
            />
          </View>
        </View>
      ) : null}

      <TrashHistoryModal
        visible={state.trashModalVisible}
        onClose={() => state.setTrashModalVisible(false)}
        hotelId={state.hotelId}
      />
    </>
  );
}

// Drag-and-drop dropzone — upload-only now (see plan.md 2026-08-03): the
// other admin actions moved to AdminFolderActions above, next to "Seç".
export function AdminFolderDropzone({ state }: { state: AdminFolderToolbarState }) {
  const { t } = state;
  return (
    <View className="gap-3 py-4 mb-2">
      <View
        ref={state.dropZoneRef}
        className={`gap-3 rounded-xl border-2 border-dashed p-5 items-center ${
          state.isDragOver ? "border-brass-400 bg-brass-400/10" : "border-ink-900/15 bg-ink-900/5"
        }`}
      >
        <Muted className="text-ink-600 text-center">
          {state.dropping
            ? t("upload.uploading")
            : Platform.OS === "web"
              ? t("upload.dropzoneHintWeb")
              : t("upload.dropzoneHintNative")}
        </Muted>
        <View className="flex-row flex-wrap items-center justify-center gap-3">
          <Button
            label={t("upload.uploadButton")}
            variant="primary"
            loading={state.uploadFiles.isPending}
            onPress={state.pickAndUpload}
          />
        </View>
      </View>

      <UploadProgressModal
        visible={state.uploadModalVisible}
        items={state.uploadItems}
        finished={state.uploadFinished}
        onClose={() => state.setUploadModalVisible(false)}
      />

      {/* A plain absolutely-positioned overlay here only covers this
          toolbar's own (small) box, not the page — this dialog needs to be
          seen regardless of where the toolbar sits, so it uses a real
          Modal (same approach as EditHotelModal), which portals above
          everything else on screen. Deliberately declared AFTER
          UploadProgressModal: react-native-web's Modal appends its portal
          <div> to document.body at mount time regardless of the `visible`
          prop, so stacking is fixed by JSX/mount order, not by which one
          opens later — this one needs to render on top of the upload
          progress modal when a duplicate-name conflict comes up mid-upload. */}
      <Modal
        visible={state.conflictPrompt !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          state.conflictPrompt?.resolve("cancel");
          state.setConflictPrompt(null);
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-4">
          {state.conflictPrompt ? (
            <Card className="p-5 gap-4 max-w-sm w-full">
              <SectionTitle>{t("upload.duplicateTitle")}</SectionTitle>
              <Body>{t("upload.duplicateMessage", { count: state.conflictPrompt.count })}</Body>
              <View className="gap-2">
                <Button
                  label={t("upload.replace")}
                  variant="primary"
                  onPress={() => {
                    state.conflictPrompt?.resolve("replace");
                    state.setConflictPrompt(null);
                  }}
                />
                <Button
                  label={t("upload.uploadAsCopy")}
                  variant="secondary"
                  onPress={() => {
                    state.conflictPrompt?.resolve("copy");
                    state.setConflictPrompt(null);
                  }}
                />
                <Button
                  label={t("upload.dialogCancel")}
                  variant="ghost"
                  onPress={() => {
                    state.conflictPrompt?.resolve("cancel");
                    state.setConflictPrompt(null);
                  }}
                />
              </View>
            </Card>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}
