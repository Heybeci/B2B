import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
// Deep import (not `from "@expo/vector-icons"`): the package barrel eagerly
// requires every icon set, which would pull all of their .ttf assets into the
// bundle. This path pulls only the Font Awesome 5 fonts.
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ActionMenu } from "../../components/ui/ActionMenu";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import {
  CameraIcon,
  ChevronIcon,
  DownloadIcon,
  DragHandleIcon,
  KebabIcon,
  MoveIcon,
  PencilIcon,
  TrashIcon,
} from "../../components/ui/IconGlyphs";
import { useToast } from "../../components/ui/Toast";
import { Tooltip } from "../../components/ui/Tooltip";
import { Body, Muted } from "../../components/ui/Typography";
import { useLanguage } from "../../i18n/LanguageContext";
import { apiClient } from "../../lib/api/client";
import { useDragReorder } from "../../lib/dnd/useDragReorder";
import * as downloadFile from "../../lib/download/downloadFile";
import { ROW_SHADOW } from "../../theme/glass";
import { useBrowseHotel } from "../hotels/hooks";
import type { BrowseFolderDto } from "../hotels/types";
import { emptyFolderNames, resolveFolderName, type FolderNames } from "./folderName";
import { FolderPickerModal } from "./FolderPickerModal";
import { useMoveFolder, useRenameFolder, useReorderFolders } from "./hooks";
import { MultiLocaleFolderDialog } from "./MultiLocaleFolderDialog";

// Brass is the app's one accent color for "selected"/active state.
const ACCENT_TEXT = "text-brass-700";
const ACCENT_SELECTED_BG = "bg-brass-400/15";
const ACCENT_HEX = "#B8903F";
const ACCENT_ICON_HEX = "#D2AA5C";

const ROW_HEIGHT = 34;
const INDENT = 18;
const GUIDE_X = 16; // aligned with each ancestor level's chevron center

interface FolderTreeProps {
  hotelId: number;
  hotelName: string;
  selectedFolderId: number | null;
  ancestorIds: number[];
  onSelect: (folderId: number | null) => void;
  isAdmin?: boolean;
}

// A left-hand file-explorer-style tree: every folder can be expanded in
// place to reveal its subfolders, rather than replacing the whole view when
// you drill down. Children are fetched lazily (one `browse` call per node,
// only once it's expanded) — there's no "whole hierarchy" endpoint, so this
// reuses the same per-folder query the old breadcrumb view relied on.
export function FolderTree({
  hotelId,
  hotelName,
  selectedFolderId,
  ancestorIds,
  onSelect,
  isAdmin,
}: FolderTreeProps) {
  const { t, locale } = useLanguage();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [downloadingKey, setDownloadingKey] = useState<number | "root" | null>(null);
  const [pendingDeleteFolder, setPendingDeleteFolder] = useState<{ id: number; names: FolderNames } | null>(null);
  const [pendingRenameFolder, setPendingRenameFolder] = useState<{ id: number; names: FolderNames } | null>(null);
  const [pendingMoveFolder, setPendingMoveFolder] = useState<{ id: number; names: FolderNames } | null>(null);

  // Whatever folder is selected (e.g. from a deep link), keep its ancestor
  // chain expanded so the selected node is always visible in the tree.
  useEffect(() => {
    if (ancestorIds.length === 0) return;
    setExpanded((prev) => {
      const missing = ancestorIds.filter((id) => !prev.has(id));
      if (missing.length === 0) return prev;
      return new Set([...prev, ...missing]);
    });
  }, [ancestorIds]);

  const { data: rootData } = useBrowseHotel(hotelId, null);
  const rootFolders = rootData?.folders ?? [];
  const rootFileIds = rootData?.files.map((f) => f.id) ?? [];

  // Root-level siblings (parentFolderId: null) get their own reorder
  // instance; each FolderTreeNode below sets up its own for its own children
  // — reordering is always scoped to "this node's direct children", never
  // across levels.
  const reorderRootFolders = useReorderFolders(hotelId, null);
  const rootDrag = useDragReorder({
    items: rootFolders,
    getId: (f) => f.id,
    onReorder: (orderedIds) => reorderRootFolders.mutate(orderedIds),
    layout: "list",
    enabled: !!isAdmin,
  });

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // The zip endpoint has no "whole hotel recursively" mode — only a real
  // folder id (with includeSubfolders) or an explicit file id list. The root
  // row falls back to zipping whatever files sit directly at the root, same
  // as the "Klasörü indir" toolbar button already does when nothing's selected.
  const downloadFolder = async (folderId: number | null) => {
    const key = folderId ?? "root";
    setDownloadingKey(key);
    try {
      if (folderId) {
        await downloadFile.downloadZip({ hotelId, folderId, includeSubfolders: true });
      } else {
        await downloadFile.downloadZip({ hotelId, fileIds: rootFileIds });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingKey(null);
    }
  };

  // Deliberately its own mutation rather than reusing `useDeleteFolder` from
  // hooks.ts — that hook is scoped to `AdminFolderToolbar`'s narrow
  // "delete the currently open folder" case and only invalidates its own
  // parent's browse query. Deleting a folder from anywhere in the tree can
  // affect a different branch than the one currently open, so this needs the
  // same wide invalidation the drag-drop handler already uses elsewhere in
  // this feature (`["hotels", hotelId]`, covering every browse query for the
  // hotel at once).
  const deleteFolder = useMutation({
    mutationFn: async (folderId: number) => apiClient.delete(`/folders/${folderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", hotelId] });
    },
  });

  // Rename/move come from hooks.ts (unlike delete above) because those hooks
  // already do the wide ["hotels", hotelId] invalidation this tree needs.
  const renameFolder = useRenameFolder(hotelId);
  const moveFolder = useMoveFolder(hotelId);

  // Reset the mutations when (re)opening a dialog so a stale error/pending
  // state from a previous attempt doesn't bleed into the next one.
  const requestRenameFolder = (folder: { id: number; names: FolderNames }) => {
    renameFolder.reset();
    setPendingRenameFolder(folder);
  };
  const requestMoveFolder = (folder: { id: number; names: FolderNames }) => {
    moveFolder.reset();
    setPendingMoveFolder(folder);
  };

  const confirmDeleteFolder = () => {
    if (!pendingDeleteFolder) return;
    const { id } = pendingDeleteFolder;
    deleteFolder.mutate(id, {
      onSuccess: () => {
        setPendingDeleteFolder(null);
        // If the deleted folder was the one currently open (or an ancestor
        // of it), that folder no longer exists — fall back to the hotel root
        // instead of leaving the view pointed at a now-missing folder.
        if (id === selectedFolderId || ancestorIds.includes(id)) {
          onSelect(null);
        }
      },
    });
  };

  return (
    <View className="gap-2">
      <TreeRow
        label={hotelName}
        depth={0}
        selected={selectedFolderId === null}
        onPress={() => onSelect(null)}
        onDownload={() => downloadFolder(null)}
        downloading={downloadingKey === "root"}
        showDownload={!isAdmin}
      />
      {rootDrag.items.map((folder) => (
        <FolderTreeNode
          key={folder.id}
          hotelId={hotelId}
          folder={folder}
          depth={1}
          expanded={expanded}
          onToggle={toggle}
          selectedFolderId={selectedFolderId}
          onSelect={onSelect}
          onDownload={downloadFolder}
          downloadingKey={downloadingKey}
          isAdmin={isAdmin}
          onDeleteRequest={setPendingDeleteFolder}
          onRenameRequest={requestRenameFolder}
          onMoveRequest={requestMoveFolder}
          itemRef={rootDrag.getItemRef(folder.id)}
          dragHandleRef={isAdmin ? rootDrag.getHandleRef(folder.id) : undefined}
          dragging={rootDrag.draggingId === folder.id}
        />
      ))}

      <ConfirmDialog
        visible={pendingDeleteFolder !== null}
        title={t("folder.deleteFolderTitle")}
        message={t("folder.deleteFolderMessage", {
          name: pendingDeleteFolder ? resolveFolderName(pendingDeleteFolder.names, locale) : "",
        })}
        confirmLabel={t("common.delete")}
        cancelLabel={t("common.cancel")}
        loading={deleteFolder.isPending}
        onCancel={() => setPendingDeleteFolder(null)}
        onConfirm={confirmDeleteFolder}
      />

      <MultiLocaleFolderDialog
        visible={pendingRenameFolder !== null}
        title={t("folder.renameFolderTitle")}
        initialValue={pendingRenameFolder?.names ?? emptyFolderNames()}
        submitLabel={t("common.save")}
        cancelLabel={t("common.cancel")}
        loading={renameFolder.isPending}
        error={renameFolder.isError ? t("folder.renameError") : null}
        onCancel={() => setPendingRenameFolder(null)}
        onSubmit={(names) => {
          if (!pendingRenameFolder) return;
          renameFolder.mutate(
            { folderId: pendingRenameFolder.id, names },
            {
              onSuccess: () => {
                setPendingRenameFolder(null);
                showToast(t("folder.renameSuccess"), "success");
              },
              onError: () => showToast(t("folder.renameError"), "error"),
            },
          );
        }}
      />

      <FolderPickerModal
        visible={pendingMoveFolder !== null}
        title={t("folder.moveFolderTitle")}
        hotelId={hotelId}
        excludeFolderId={pendingMoveFolder?.id}
        loading={moveFolder.isPending}
        error={moveFolder.isError ? t("folder.moveError") : null}
        onCancel={() => setPendingMoveFolder(null)}
        onSelect={(targetFolderId) => {
          if (!pendingMoveFolder) return;
          moveFolder.mutate(
            { folderId: pendingMoveFolder.id, newParentFolderId: targetFolderId },
            { onSuccess: () => setPendingMoveFolder(null) },
          );
        }}
      />
    </View>
  );
}

function FolderTreeNode({
  hotelId,
  folder,
  depth,
  expanded,
  onToggle,
  selectedFolderId,
  onSelect,
  onDownload,
  downloadingKey,
  isAdmin,
  onDeleteRequest,
  onRenameRequest,
  onMoveRequest,
  itemRef,
  dragHandleRef,
  dragging,
}: {
  hotelId: number;
  folder: BrowseFolderDto;
  depth: number;
  expanded: Set<number>;
  onToggle: (id: number) => void;
  selectedFolderId: number | null;
  onSelect: (id: number) => void;
  onDownload: (folderId: number) => void;
  downloadingKey: number | "root" | null;
  isAdmin?: boolean;
  onDeleteRequest: (folder: { id: number; names: FolderNames }) => void;
  onRenameRequest: (folder: { id: number; names: FolderNames }) => void;
  onMoveRequest: (folder: { id: number; names: FolderNames }) => void;
  // This node's own position within ITS parent's sibling list (root list or
  // another node's children list) — measured/dragged by the PARENT's
  // useDragReorder instance, not this node's own (see childDrag below, which
  // is instead about THIS node's children).
  itemRef?: (node: View | null) => void;
  dragHandleRef?: (node: View | null) => void;
  dragging?: boolean;
}) {
  const isExpanded = expanded.has(folder.id);
  const { data } = useBrowseHotel(hotelId, folder.id, isExpanded);
  const children = data?.folders ?? [];
  const { locale } = useLanguage();
  const displayName = resolveFolderName(folder, locale);

  // This node's OWN children get their own reorder scope (parentFolderId:
  // folder.id) — distinct from `itemRef`/`dragHandleRef` above, which place
  // THIS node inside its parent's list.
  const reorderChildren = useReorderFolders(hotelId, folder.id);
  const childDrag = useDragReorder({
    items: children,
    getId: (f) => f.id,
    onReorder: (orderedIds) => reorderChildren.mutate(orderedIds),
    layout: "list",
    enabled: !!isAdmin,
  });

  return (
    <>
      <TreeRow
        label={displayName}
        depth={depth}
        selected={selectedFolderId === folder.id}
        expanded={isExpanded}
        photoCount={folder.photoCount}
        onPress={() => onSelect(folder.id)}
        onTogglePress={() => onToggle(folder.id)}
        onDownload={() => onDownload(folder.id)}
        downloading={downloadingKey === folder.id}
        onDelete={isAdmin ? () => onDeleteRequest({ id: folder.id, names: folder }) : undefined}
        onRename={isAdmin ? () => onRenameRequest({ id: folder.id, names: folder }) : undefined}
        onMove={isAdmin ? () => onMoveRequest({ id: folder.id, names: folder }) : undefined}
        showDownload={!isAdmin}
        itemRef={itemRef}
        dragHandleRef={dragHandleRef}
        dragging={dragging}
      />
      {isExpanded
        ? childDrag.items.map((child) => (
            <FolderTreeNode
              key={child.id}
              hotelId={hotelId}
              folder={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              onDownload={onDownload}
              downloadingKey={downloadingKey}
              isAdmin={isAdmin}
              onDeleteRequest={onDeleteRequest}
              onRenameRequest={onRenameRequest}
              onMoveRequest={onMoveRequest}
              itemRef={childDrag.getItemRef(child.id)}
              dragHandleRef={isAdmin ? childDrag.getHandleRef(child.id) : undefined}
              dragging={childDrag.draggingId === child.id}
            />
          ))
        : null}
    </>
  );
}

// Thin vertical rules through each ancestor level's chevron column, so
// nested rows visibly connect back up the hierarchy instead of floating
// indentation that's easy to lose track of.
function GuideLines({ depth }: { depth: number }) {
  if (depth === 0) return null;
  return (
    <>
      {Array.from({ length: depth }).map((_, i) => (
        <View
          key={i}
          className="absolute top-0 bottom-0 w-px bg-ink-900/15"
          style={{ left: 8 + i * INDENT + GUIDE_X, pointerEvents: "none" }}
        />
      ))}
    </>
  );
}

// Font Awesome 5 Free (solid) "folder" / "folder-open". Both glyphs exist in
// the Free solid set, so no Pro font is involved. This replaces a hand-drawn
// View silhouette whose "open" variant never actually read as an open folder.
const FOLDER_GLYPH_SIZE = 14; // in line with the row's other 14-16px glyphs
const FOLDER_GLYPH_BOX = 18; // see note below

// The fixed-size, centered box is deliberate on two counts:
//   1. @expo/vector-icons renders an empty <Text /> until it has loaded its
//      font (async, see createIconSet in the package) — including during the
//      static web prerender — so an unsized glyph would pop the label sideways
//      on hydration.
//   2. "folder-open" is a wider glyph than "folder" (576 vs 512 viewBox
//      units), which would otherwise nudge the label on every expand/collapse.
function FolderGlyph({ selected }: { selected: boolean }) {
  return (
    <View
      style={{
        width: FOLDER_GLYPH_BOX,
        height: FOLDER_GLYPH_BOX,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <FontAwesome5
        name={selected ? "folder-open" : "folder"}
        solid
        size={FOLDER_GLYPH_SIZE}
        color={ACCENT_ICON_HEX}
      />
    </View>
  );
}

function TreeRow({
  label,
  depth,
  selected,
  expanded,
  photoCount,
  onPress,
  onTogglePress,
  onDownload,
  downloading,
  onDelete,
  onRename,
  onMove,
  showDownload,
  itemRef,
  dragHandleRef,
  dragging,
}: {
  label: string;
  depth: number;
  selected: boolean;
  expanded?: boolean;
  // Recursive photo count for this folder + all its nested subfolders —
  // undefined for the hotel/root row (which has no FolderDto of its own;
  // the whole-hotel total is already shown elsewhere on the page, see
  // plan.md's "Web-optimize" / hotel list sections). Shown even when 0 —
  // in a navigation tree, "this whole branch is empty" is useful signal,
  // unlike the hotel-card treatment elsewhere which hides zero.
  photoCount?: number;
  onPress: () => void;
  onTogglePress?: () => void;
  onDownload: () => void;
  downloading?: boolean;
  onDelete?: () => void;
  onRename?: () => void;
  onMove?: () => void;
  // Admin's hotel-content page manages files rather than consuming them, so
  // it hides download entirely; the public hotel page keeps it, positioned
  // to the right of the name instead of the old before-the-chevron spot.
  showDownload: boolean;
  // Drag-to-reorder — undefined `dragHandleRef` (the root/hotel row, or any
  // row rendered for a non-admin) simply omits the handle glyph.
  itemRef?: (node: View | null) => void;
  dragHandleRef?: (node: View | null) => void;
  dragging?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <Pressable
      ref={itemRef}
      onPress={onPress}
      className={`relative flex-row items-center gap-1.5 pr-2 rounded-md border border-ink-900/10 ${
        selected ? ACCENT_SELECTED_BG : "bg-paper/90"
      }`}
      style={[
        { paddingLeft: 8 + depth * INDENT, height: ROW_HEIGHT },
        ROW_SHADOW,
        // Dimmed to read as an empty "hole" left behind by the tile that's
        // now floating under the cursor (see useDragReorder's ghost clone) —
        // it still slides via the shared FLIP animation like any sibling.
        dragging ? { opacity: 0.3 } : null,
      ]}
    >
      <GuideLines depth={depth} />
      {selected ? (
        <View
          className="absolute left-0 top-0.5 bottom-0.5 w-[3px] rounded-full"
          style={{ backgroundColor: ACCENT_HEX }}
        />
      ) : null}
      {dragHandleRef ? (
        <Tooltip label={t("common.dragToReorder")}>
          <View ref={dragHandleRef} className="w-4 h-5 items-center justify-center">
            <DragHandleIcon color="#8a7f6f" />
          </View>
        </Tooltip>
      ) : null}
      {onTogglePress ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onTogglePress();
          }}
          hitSlop={8}
          className="w-4 items-center justify-center"
        >
          <ChevronIcon expanded={expanded} />
        </Pressable>
      ) : (
        <View className="w-4" />
      )}
      {depth > 0 ? <FolderGlyph selected={selected} /> : null}
      <Body numberOfLines={1} className={`flex-1 ${selected ? `${ACCENT_TEXT} font-semibold` : "text-ink-700"}`}>
        {label}
      </Body>
      {/* Recursive per-folder photo count — icon + bare number (kept compact
          for a dense, deeply-indented row), full phrase discoverable via the
          tooltip. Sits between the name and the trailing action icons. */}
      {typeof photoCount === "number" ? (
        <Tooltip label={t("hotelList.photoCount", { count: photoCount })}>
          <View className="flex-row items-center gap-1">
            <CameraIcon />
            <Muted>{photoCount}</Muted>
          </View>
        </Tooltip>
      ) : null}
      {/* Download sits to the right of the name — public hotel page only;
          admin's content-management view hides it entirely (bkz. showDownload). */}
      {showDownload ? (
        <Tooltip label={t("folder.download")}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              if (!downloading) onDownload();
            }}
            hitSlop={6}
            className="w-6 h-6 rounded-full items-center justify-center"
            style={{ backgroundColor: ACCENT_HEX }}
          >
            {downloading ? <ActivityIndicator size="small" color="#fff" /> : <DownloadIcon color="#fff" />}
          </Pressable>
        </Tooltip>
      ) : null}
      {/* Admin-only actions (rename/move/delete) live in one kebab-triggered
          menu instead of three always-visible icons, so the row's chrome no
          longer squeezes the folder name into an ellipsis. Download stays a
          standalone icon: it's the one action shown to everyone (public side
          included), where there's no crowding to solve. */}
      {onRename || onMove || onDelete ? (
        <Tooltip label={t("common.actions")}>
          <ActionMenu
            items={[
              ...(onRename
                ? [{ key: "rename", label: t("common.rename"), icon: <PencilIcon color="#3A342B" />, onPress: onRename }]
                : []),
              ...(onMove
                ? [{ key: "move", label: t("common.move"), icon: <MoveIcon color="#3A342B" />, onPress: onMove }]
                : []),
              ...(onDelete
                ? [{ key: "delete", label: t("common.delete"), icon: <TrashIcon color="#dc2626" />, destructive: true, onPress: onDelete }]
                : []),
            ]}
          >
            <View className="w-6 h-6 rounded-full items-center justify-center bg-black/50">
              <KebabIcon />
            </View>
          </ActionMenu>
        </Tooltip>
      ) : null}
    </Pressable>
  );
}
