import { useState } from "react";
import { Pressable, View } from "react-native";
import { ChevronIcon } from "../../components/ui/IconGlyphs";
import { Body } from "../../components/ui/Typography";
import { useLanguage } from "../../i18n/LanguageContext";
import { useBrowseHotel } from "../hotels/hooks";
import type { FolderDto } from "../hotels/types";

const ROW_HEIGHT = 34;
const INDENT = 18;

interface FolderPickerTreeProps {
  hotelId: number;
  // The folder being moved (when picking a destination for a folder move):
  // that node is rendered but can be neither selected nor expanded, which
  // also makes its whole subtree unreachable — so "into itself or one of
  // its own descendants" is blocked client-side before the backend's own
  // 400 would kick in.
  excludeFolderId?: number;
  // Freezes every row while the caller's move mutation is in flight.
  disabled?: boolean;
  onSelect: (folderId: number | null) => void;
}

// A read-only sibling of FolderTree: same lazy per-node `browse` fetching
// (expand a node → fetch its children), but rows carry no download/delete/
// rename/move actions — pressing a row just picks it as the destination.
// A synthetic "root" row on top stands for parentFolderId = null.
export function FolderPickerTree({ hotelId, excludeFolderId, disabled, onSelect }: FolderPickerTreeProps) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const { data } = useBrowseHotel(hotelId, null);
  const rootFolders = data?.folders ?? [];

  const toggle = (id: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <View className="gap-2">
      <PickerRow
        label={t("folder.rootFolder")}
        depth={0}
        disabled={disabled}
        onPress={() => onSelect(null)}
      />
      {rootFolders.map((folder) => (
        <PickerNode
          key={folder.id}
          hotelId={hotelId}
          folder={folder}
          depth={1}
          expanded={expanded}
          onToggle={toggle}
          excludeFolderId={excludeFolderId}
          disabled={disabled}
          onSelect={onSelect}
        />
      ))}
    </View>
  );
}

function PickerNode({
  hotelId,
  folder,
  depth,
  expanded,
  onToggle,
  excludeFolderId,
  disabled,
  onSelect,
}: {
  hotelId: number;
  folder: FolderDto;
  depth: number;
  expanded: Set<number>;
  onToggle: (id: number) => void;
  excludeFolderId?: number;
  disabled?: boolean;
  onSelect: (folderId: number | null) => void;
}) {
  const isExcluded = folder.id === excludeFolderId;
  const isExpanded = expanded.has(folder.id) && !isExcluded;
  const { data } = useBrowseHotel(hotelId, folder.id, isExpanded);
  const children = data?.folders ?? [];

  return (
    <>
      <PickerRow
        label={folder.name}
        depth={depth}
        disabled={disabled || isExcluded}
        onPress={() => onSelect(folder.id)}
        onTogglePress={isExcluded ? undefined : () => onToggle(folder.id)}
        expandedState={isExpanded}
      />
      {isExpanded
        ? children.map((child) => (
            <PickerNode
              key={child.id}
              hotelId={hotelId}
              folder={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              excludeFolderId={excludeFolderId}
              disabled={disabled}
              onSelect={onSelect}
            />
          ))
        : null}
    </>
  );
}

function PickerRow({
  label,
  depth,
  disabled,
  onPress,
  onTogglePress,
  expandedState,
}: {
  label: string;
  depth: number;
  disabled?: boolean;
  onPress: () => void;
  onTogglePress?: () => void;
  expandedState?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      className={`flex-row items-center gap-1.5 pr-2 rounded-md border border-ink-900/10 ${
        disabled ? "bg-ink-900/5 opacity-50" : "bg-paper/90"
      }`}
      style={{ paddingLeft: 8 + depth * INDENT, height: ROW_HEIGHT }}
    >
      {onTogglePress ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            if (!disabled) onTogglePress();
          }}
          hitSlop={8}
          className="w-4 items-center justify-center"
        >
          <ChevronIcon expanded={expandedState} />
        </Pressable>
      ) : (
        <View className="w-4" />
      )}
      <Body numberOfLines={1} className="flex-1 text-ink-700">
        {label}
      </Body>
    </Pressable>
  );
}
