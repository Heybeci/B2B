import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { DownloadIcon, EyeIcon, MoveIcon, PencilIcon } from "../../components/ui/IconGlyphs";
import { PromptDialog } from "../../components/ui/PromptDialog";
import { Tooltip } from "../../components/ui/Tooltip";
import { Muted, SectionTitle } from "../../components/ui/Typography";
import { Card } from "../../components/ui/Card";
import { useLanguage } from "../../i18n/LanguageContext";
import { ROW_SHADOW } from "../../theme/glass";
import * as downloadFile from "../../lib/download/downloadFile";
import { fileTypeLabel, formatFileSize } from "../../lib/format";
import { useGridColumns } from "../../lib/useGridColumns";
import { useBrowseHotel } from "../hotels/hooks";
import type { FileDto } from "../hotels/types";
import { FileThumbnail } from "./FileThumbnail";
import { FolderPickerModal } from "./FolderPickerModal";
import { FolderTree } from "./FolderTree";
import { useBulkDeleteFiles, useDeleteFile, useMoveFile, useRenameFile } from "./hooks";
import { MultiSelectToolbar } from "./MultiSelectToolbar";
import { treePanelWidth } from "./treePanelWidth";

// Resizable folder-tree panel bounds: the default matches the old fixed
// `lg:w-72` (288px); min/max keep it from swallowing the file grid or
// growing past usefulness.
const TREE_DEFAULT_WIDTH = 288;
const TREE_MIN_WIDTH = 220;
const TREE_MAX_WIDTH = 560;

// Pure CSS percentage grid (gutter-via-padding) — every tile gets an
// identical 1/N width straight from layout, no JS measurement or two-phase
// render, so tiles can't ever settle at visibly different sizes.
const GUTTER = 8; // half of the 16px visual gap on each side of a tile

// Brass is the app's one accent color — everything selected/primary uses it
// instead of blue.
const ACCENT_BORDER_COLOR = "#B8903F";
const ACCENT_SELECTED_FILL = "bg-brass-400 border-brass-400";
const ACCENT_SOLID_BG = "bg-brass-500";

function ActionIconButton({ onPress, children }: { onPress: () => void; children: React.ReactNode }) {
  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
      className="w-8 h-8 rounded-full bg-black/60 items-center justify-center"
    >
      {children}
    </Pressable>
  );
}

function ActionTextButton({
  onPress,
  label,
  primary,
}: {
  onPress: () => void;
  label: string;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
      className={`flex-1 items-center justify-center py-1.5 rounded-md ${
        primary ? ACCENT_SOLID_BG : "border border-ink-900/20"
      }`}
    >
      <Muted className={`text-[11px] ${primary ? "text-white font-medium" : "text-ink-700"}`}>{label}</Muted>
    </Pressable>
  );
}

// Renaming a file must never change its extension: the physical file and its
// MimeType stay untouched on the backend (only the display OriginalName
// changes), so an edited extension would just be a lie in the display name.
// The dialog therefore only edits the base name, with the extension shown as
// a fixed suffix. Split on the LAST dot; no dot (or only a leading dot, as in
// ".env"-style names) means no extension — the whole name stays editable.
function splitExtension(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return { base: name, ext: "" };
  return { base: name.slice(0, dot), ext: name.slice(dot) };
}

function GridSlot({ columns, children }: { columns: number; children: React.ReactNode }) {
  return <View style={{ width: `${100 / columns}%`, padding: GUTTER }}>{children}</View>;
}

function FileCard({
  file,
  selectMode,
  selected,
  onToggleSelect,
  onView,
  onDownload,
  isAdmin,
  onDelete,
  onRename,
  onMove,
}: {
  file: FileDto;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onView: () => void;
  onDownload: () => void;
  isAdmin?: boolean;
  onDelete?: () => void;
  onRename?: () => void;
  onMove?: () => void;
}) {
  const { t } = useLanguage();
  return (
    // Card's base className already sets a border color; an appended className
    // string can't reliably override it, since generated-stylesheet order (not
    // JSX order) decides the winner — only an inline style is guaranteed to win.
    // Shadow is also overridden to the smaller ROW_SHADOW: Card's own default
    // is sized for a single isolated card and pools into a dark seam between
    // rows when tiled edge-to-edge in a tight grid like this one.
    <Card
      className="overflow-hidden w-full"
      style={[ROW_SHADOW, selected ? { borderColor: ACCENT_BORDER_COLOR, borderWidth: 2 } : null]}
    >
      <Pressable onPress={selectMode ? onToggleSelect : onView} onLongPress={onToggleSelect}>
        <View className="w-full aspect-square bg-ink-900/5">
          <FileThumbnail file={file} />
          {selectMode ? (
            <View
              className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 ${
                selected ? ACCENT_SELECTED_FILL : "bg-white/80 border-white"
              }`}
            />
          ) : (
            <View className="absolute bottom-2 right-2 flex-row gap-1.5">
              <Tooltip label={t("folder.view")}>
                <ActionIconButton onPress={onView}>
                  <EyeIcon />
                </ActionIconButton>
              </Tooltip>
              <Tooltip label={t("folder.download")}>
                <ActionIconButton onPress={onDownload}>
                  <DownloadIcon />
                </ActionIconButton>
              </Tooltip>
            </View>
          )}
          {isAdmin && !selectMode ? (
            <View className="absolute top-2 right-2 flex-row gap-1.5">
              <Tooltip label={t("common.rename")}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onRename?.();
                  }}
                  className="w-6 h-6 rounded-full bg-white/90 items-center justify-center"
                >
                  <PencilIcon color="#3A342B" />
                </Pressable>
              </Tooltip>
              <Tooltip label={t("common.move")}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onMove?.();
                  }}
                  className="w-6 h-6 rounded-full bg-white/90 items-center justify-center"
                >
                  <MoveIcon color="#3A342B" />
                </Pressable>
              </Tooltip>
              <Tooltip label={t("common.delete")}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onDelete?.();
                  }}
                  className="w-6 h-6 rounded-full bg-white/90 items-center justify-center"
                >
                  <Muted className="text-red-600 text-xs">✕</Muted>
                </Pressable>
              </Tooltip>
            </View>
          ) : null}
        </View>
      </Pressable>
      <View className="p-2 gap-1.5">
        <Muted numberOfLines={1} className="text-ink-800" style={{ fontSize: 14.4, fontWeight: "600" }}>
          {file.originalName}
        </Muted>
        <Muted className="text-[10px]">
          {fileTypeLabel(file.mimeType)} · {formatFileSize(file.sizeBytes)}
        </Muted>
        {!selectMode ? (
          <View className="flex-row gap-2 mt-0.5">
            <ActionTextButton onPress={onView} label={t("folder.view")} />
            <ActionTextButton onPress={onDownload} label={t("folder.download")} primary />
          </View>
        ) : null}
      </View>
    </Card>
  );
}

interface FolderBrowserProps {
  hotelId: number;
  folderId: number | null;
  onNavigate: (folderId: number | null) => void;
  adminToolbar?: React.ReactNode;
  isAdmin?: boolean;
  // Rendered right after the title/toolbar row (e.g. the admin page's
  // published/draft status) — kept as a slot rather than baked in, since
  // the public page has no such status to show.
  belowHeaderContent?: React.ReactNode;
  // The public hotel page gives this component the full remaining page
  // height to work with, so the tree and file grid can each scroll inside
  // their own bounded panel instead of the whole page scrolling together.
  // The admin page embeds this inside a page-level ScrollView alongside
  // other sections (hotel info card) with no bounded height to hand down,
  // so it keeps the old "just grows with content" layout there.
  boundedHeight?: boolean;
}

export function FolderBrowser({
  hotelId,
  folderId,
  onNavigate,
  adminToolbar,
  isAdmin,
  belowHeaderContent,
  boundedHeight = false,
}: FolderBrowserProps) {
  const { t } = useLanguage();
  const { data, isLoading, isError } = useBrowseHotel(hotelId, folderId);
  const deleteFile = useDeleteFile(hotelId, folderId);
  const bulkDeleteFiles = useBulkDeleteFiles(hotelId, folderId);
  const renameFile = useRenameFile(hotelId);
  const moveFile = useMoveFile(hotelId);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [includeSubfolders, setIncludeSubfolders] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [pendingDeleteFile, setPendingDeleteFile] = useState<FileDto | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [pendingRenameFile, setPendingRenameFile] = useState<FileDto | null>(null);
  const [pendingMoveFile, setPendingMoveFile] = useState<FileDto | null>(null);
  const columns = useGridColumns();

  // --- Resizable tree panel (web + desktop only) ---------------------------
  // Same 1024px threshold as Tailwind's `lg:` — resizing only makes sense in
  // the side-by-side desktop layout; below it the panel is full-width anyway.
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 1024;
  const canResize = Platform.OS === "web" && isDesktop;
  const [treeWidth, setTreeWidth] = useState<number>(() => {
    const saved = treePanelWidth.get();
    return saved !== null && saved >= TREE_MIN_WIDTH && saved <= TREE_MAX_WIDTH
      ? saved
      : TREE_DEFAULT_WIDTH;
  });
  // Latest width for the drag handlers, so the effect below doesn't have to
  // depend on `treeWidth` — re-running it mid-drag would tear down the very
  // mousemove/mouseup listeners driving the drag.
  const treeWidthRef = useRef(treeWidth);
  treeWidthRef.current = treeWidth;
  const dragHandleRef = useRef<View>(null);

  // Wired via a direct DOM ref + addEventListener, the same technique
  // AdminFolderToolbar's drag-and-drop uses (RNW's <View> exposes no
  // mouse-event props). mousemove/mouseup go on `window` so the drag keeps
  // tracking even when the pointer leaves the thin handle.
  useEffect(() => {
    if (!canResize) return;
    const handle = dragHandleRef.current as unknown as HTMLElement | null;
    if (!handle) return;

    let startX = 0;
    let startWidth = 0;

    const onMouseMove = (e: MouseEvent) => {
      setTreeWidth(
        Math.max(TREE_MIN_WIDTH, Math.min(TREE_MAX_WIDTH, startWidth + (e.clientX - startX))),
      );
    };
    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      treePanelWidth.set(treeWidthRef.current);
    };
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      startX = e.clientX;
      startWidth = treeWidthRef.current;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    };

    // ViewStyle's `cursor` type only allows auto/pointer, so set it on the
    // DOM node directly.
    handle.style.cursor = "col-resize";
    handle.addEventListener("mousedown", onMouseDown);
    return () => {
      handle.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [canResize]);
  // -------------------------------------------------------------------------

  const renameParts = pendingRenameFile ? splitExtension(pendingRenameFile.originalName) : null;

  const files = data?.files ?? [];
  const hasSubfolders = (data?.folders.length ?? 0) > 0;
  const ancestorIds = (data?.breadcrumb ?? []).map((crumb) => crumb.id);
  const currentLabel = data?.folder?.name ?? data?.hotel.name ?? t("common.hotel");

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(files.map((f) => f.id)));
  const clearSelection = () => setSelected(new Set());

  const runDownload = async (fn: () => Promise<void>) => {
    setDownloading(true);
    try {
      await fn();
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  };

  const downloadSelected = () =>
    runDownload(() => downloadFile.downloadZip({ hotelId, fileIds: [...selected] }));

  const downloadFolder = () =>
    runDownload(() =>
      folderId
        ? downloadFile.downloadZip({ hotelId, folderId, includeSubfolders })
        : downloadFile.downloadZip({ hotelId, fileIds: files.map((f) => f.id) }),
    );

  const treeScrollArea = (
    <FolderTree
      hotelId={hotelId}
      hotelName={data?.hotel.name ?? t("common.hotel")}
      selectedFolderId={folderId}
      ancestorIds={ancestorIds}
      onSelect={onNavigate}
      isAdmin={isAdmin}
    />
  );

  const grid =
    isLoading ? (
      <Muted style={{ fontSize: 14.4, fontWeight: "600" }}>{t("common.loading")}</Muted>
    ) : isError ? (
      <Muted style={{ fontSize: 14.4, fontWeight: "600" }}>{t("folder.loadError")}</Muted>
    ) : files.length === 0 ? (
      <Muted style={{ fontSize: 14.4, fontWeight: "600" }}>{t("folder.empty")}</Muted>
    ) : (
      <View className="flex-row flex-wrap py-1" style={{ marginHorizontal: -GUTTER }}>
        {files.map((file) => (
          <GridSlot key={`file-${file.id}`} columns={columns}>
            <FileCard
              file={file}
              selectMode={selectMode}
              selected={selected.has(file.id)}
              onToggleSelect={() => toggleSelect(file.id)}
              onView={() => downloadFile.viewFile(file.id)}
              onDownload={() => runDownload(() => downloadFile.downloadSingleFile(file.id, file.originalName))}
              isAdmin={isAdmin}
              onDelete={() => setPendingDeleteFile(file)}
              onRename={() => {
                renameFile.reset();
                setPendingRenameFile(file);
              }}
              onMove={() => {
                moveFile.reset();
                setPendingMoveFile(file);
              }}
            />
          </GridSlot>
        ))}
      </View>
    );

  return (
    <View className={`flex-col lg:flex-row gap-5 ${boundedHeight ? "flex-1 min-h-0" : ""}`}>
      <View
        className={`relative lg:shrink-0 ${boundedHeight ? "lg:h-full" : ""}`}
        style={isDesktop ? { width: treeWidth } : undefined}
      >
        <Card className={`p-2 ${boundedHeight ? "max-h-72 lg:max-h-none lg:h-full" : ""}`}>
          {boundedHeight ? (
            <ScrollView className="flex-1" contentContainerClassName="gap-2">
              {treeScrollArea}
            </ScrollView>
          ) : (
            treeScrollArea
          )}
        </Card>

        {/* Thin drag handle in the gap between tree and grid — web/desktop
            only. Cursor + listeners are wired in the resize effect above. */}
        {canResize ? (
          <View
            ref={dragHandleRef}
            className="absolute top-0 bottom-0 rounded-full bg-ink-900/10"
            style={{ right: -13, width: 6 }}
          />
        ) : null}
      </View>

      <View className={`flex-1 min-w-0 ${boundedHeight ? "min-h-0 lg:h-full" : ""}`}>
        {/* Title + selection/download controls on one row, so this header
            never wraps into a second line the way title-then-toolbar
            stacked before. */}
        <View className="flex-row items-center justify-between gap-3 flex-wrap pb-3 border-b border-ink-900/10 mb-3">
          <SectionTitle className="shrink-0" style={{ fontSize: 14.4, fontWeight: "600" }}>{currentLabel}</SectionTitle>
          {files.length > 0 ? (
            <MultiSelectToolbar
              selectMode={selectMode}
              onToggleSelectMode={() => {
                setSelectMode((v) => !v);
                clearSelection();
              }}
              selectedCount={selected.size}
              totalCount={files.length}
              onSelectAll={selectAll}
              onClearSelection={clearSelection}
              onDownloadSelected={downloadSelected}
              downloading={downloading}
              onDeleteSelected={isAdmin ? () => setPendingBulkDelete(true) : undefined}
              deleting={bulkDeleteFiles.isPending}
              includeSubfolders={includeSubfolders}
              onToggleIncludeSubfolders={setIncludeSubfolders}
              onDownloadFolder={downloadFolder}
              hasSubfolders={hasSubfolders}
            />
          ) : null}
        </View>

        {belowHeaderContent}

        {adminToolbar}

        {boundedHeight ? (
          <ScrollView className="flex-1" contentContainerClassName="pb-6">
            {grid}
          </ScrollView>
        ) : (
          grid
        )}
      </View>

      <ConfirmDialog
        visible={pendingDeleteFile !== null}
        title={t("folder.deleteFileTitle")}
        message={t("folder.deleteFileMessage", { name: pendingDeleteFile?.originalName ?? "" })}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        loading={deleteFile.isPending}
        onCancel={() => setPendingDeleteFile(null)}
        onConfirm={() => {
          if (!pendingDeleteFile) return;
          deleteFile.mutate(pendingDeleteFile.id, {
            onSuccess: () => setPendingDeleteFile(null),
          });
        }}
      />

      <ConfirmDialog
        visible={pendingBulkDelete}
        title={t("folder.deleteSelectedTitle")}
        message={t("folder.deleteSelectedMessage", { count: selected.size })}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        loading={bulkDeleteFiles.isPending}
        onCancel={() => setPendingBulkDelete(false)}
        onConfirm={() => {
          bulkDeleteFiles.mutate([...selected], {
            onSuccess: () => {
              setPendingBulkDelete(false);
              clearSelection();
            },
          });
        }}
      />

      <PromptDialog
        visible={pendingRenameFile !== null}
        title={t("folder.renameFileTitle")}
        initialValue={renameParts?.base ?? ""}
        placeholder={t("folder.renamePlaceholder")}
        submitLabel={t("common.save")}
        cancelLabel={t("common.cancel")}
        loading={renameFile.isPending}
        onCancel={() => setPendingRenameFile(null)}
        suffix={renameParts?.ext || undefined}
        onSubmit={(base) => {
          if (!pendingRenameFile || !renameParts) return;
          renameFile.mutate(
            { fileId: pendingRenameFile.id, originalName: base + renameParts.ext },
            { onSuccess: () => setPendingRenameFile(null) },
          );
        }}
      />

      <FolderPickerModal
        visible={pendingMoveFile !== null}
        title={t("folder.moveFileTitle")}
        hotelId={hotelId}
        loading={moveFile.isPending}
        error={moveFile.isError ? t("folder.moveError") : null}
        onCancel={() => setPendingMoveFile(null)}
        onSelect={(targetFolderId) => {
          if (!pendingMoveFile) return;
          moveFile.mutate(
            { fileId: pendingMoveFile.id, folderId: targetFolderId },
            { onSuccess: () => setPendingMoveFile(null) },
          );
        }}
      />
    </View>
  );
}
