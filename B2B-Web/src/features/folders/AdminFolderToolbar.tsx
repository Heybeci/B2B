import { useEffect, useRef, useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Body, Muted, SectionTitle } from "../../components/ui/Typography";
import { useLanguage } from "../../i18n/LanguageContext";
import { appendFileToFormData } from "../../lib/upload/appendFile";
import { type ConflictChoice, uploadDroppedItems } from "./dragDropUpload";
import { useCreateFolder, useDeleteFolder, useUploadFiles } from "./hooks";

interface AdminFolderToolbarProps {
  hotelId: number;
  folderId: number | null;
  onFolderDeleted: () => void;
}

export function AdminFolderToolbar({ hotelId, folderId, onFolderDeleted }: AdminFolderToolbarProps) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const createFolder = useCreateFolder(hotelId, folderId);
  const deleteFolder = useDeleteFolder(hotelId, folderId);
  const uploadFiles = useUploadFiles(hotelId, folderId);

  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropping, setDropping] = useState(false);
  const [conflictPrompt, setConflictPrompt] = useState<{
    count: number;
    resolve: (choice: ConflictChoice) => void;
  } | null>(null);
  const dropZoneRef = useRef<View>(null);

  const submitNewFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder.mutateAsync(newFolderName.trim());
    setNewFolderName("");
    setCreatingFolder(false);
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
      uploadDroppedItems({
        hotelId,
        targetFolderId: folderId,
        dataTransfer: e.dataTransfer,
        confirmConflicts: (count) =>
          new Promise<ConflictChoice>((resolve) => setConflictPrompt({ count, resolve })),
      })
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["hotels", hotelId] });
        })
        .catch((err) => console.error(err))
        .finally(() => setDropping(false));
    };

    node.addEventListener("dragover", onDragOver);
    node.addEventListener("dragleave", onDragLeave);
    node.addEventListener("drop", onDrop);
    return () => {
      node.removeEventListener("dragover", onDragOver);
      node.removeEventListener("dragleave", onDragLeave);
      node.removeEventListener("drop", onDrop);
    };
  }, [hotelId, folderId, queryClient]);

  return (
    <View className="gap-3 py-4 mb-2">
      <View
        ref={dropZoneRef}
        className={`gap-3 rounded-xl border-2 border-dashed p-5 items-center ${
          isDragOver ? "border-brass-400 bg-brass-400/10" : "border-ink-900/15 bg-ink-900/5"
        }`}
      >
        <Muted className="text-ink-600 text-center">
          {dropping
            ? t("upload.uploading")
            : Platform.OS === "web"
              ? t("upload.dropzoneHintWeb")
              : t("upload.dropzoneHintNative")}
        </Muted>
        <View className="flex-row flex-wrap items-center justify-center gap-3">
          <Button
            label={t("upload.uploadButton")}
            variant="primary"
            loading={uploadFiles.isPending}
            onPress={pickAndUpload}
          />
          <Button label={t("upload.newFolder")} variant="secondary" onPress={() => setCreatingFolder((v) => !v)} />
          {folderId ? (
            <Pressable
              onPress={async () => {
                await deleteFolder.mutateAsync(folderId);
                onFolderDeleted();
              }}
            >
              <Muted className="text-red-600">{t("upload.deleteThisFolder")}</Muted>
            </Pressable>
          ) : null}
        </View>
        {creatingFolder ? (
          <View className="flex-row items-center gap-2 max-w-sm w-full">
            <View className="flex-1">
              <Input
                placeholder={t("upload.folderNamePlaceholder")}
                value={newFolderName}
                onChangeText={setNewFolderName}
                autoFocus
              />
            </View>
            <Button label={t("upload.add")} onPress={submitNewFolder} loading={createFolder.isPending} />
          </View>
        ) : null}
      </View>

      {/* A plain absolutely-positioned overlay here only covers this
          toolbar's own (small) box, not the page — this dialog needs to be
          seen regardless of where the toolbar sits, so it uses a real
          Modal (same approach as EditHotelModal), which portals above
          everything else on screen. */}
      <Modal
        visible={conflictPrompt !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          conflictPrompt?.resolve("cancel");
          setConflictPrompt(null);
        }}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-4">
          {conflictPrompt ? (
            <Card className="p-5 gap-4 max-w-sm w-full">
              <SectionTitle>{t("upload.duplicateTitle")}</SectionTitle>
              <Body>{t("upload.duplicateMessage", { count: conflictPrompt.count })}</Body>
              <View className="gap-2">
                <Button
                  label={t("upload.replace")}
                  variant="primary"
                  onPress={() => {
                    conflictPrompt.resolve("replace");
                    setConflictPrompt(null);
                  }}
                />
                <Button
                  label={t("upload.uploadAsCopy")}
                  variant="secondary"
                  onPress={() => {
                    conflictPrompt.resolve("copy");
                    setConflictPrompt(null);
                  }}
                />
                <Button
                  label={t("upload.dialogCancel")}
                  variant="ghost"
                  onPress={() => {
                    conflictPrompt.resolve("cancel");
                    setConflictPrompt(null);
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
