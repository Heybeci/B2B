import { Pressable, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Muted } from "../../components/ui/Typography";
import { useLanguage } from "../../i18n/LanguageContext";

// A compact brass-accented track switch — replaces the native <Switch>,
// whose default green thumb doesn't belong in this app's ink/paper/brass
// palette.
function AccentSwitch({ value, onChange }: { value: boolean; onChange: (next: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      className={`w-10 h-[22px] rounded-full p-0.5 flex-row ${
        value ? "bg-brass-400 justify-end" : "bg-ink-900/15 justify-start"
      }`}
    >
      <View className="w-[18px] h-[18px] rounded-full bg-white" />
    </Pressable>
  );
}

interface MultiSelectToolbarProps {
  selectMode: boolean;
  onToggleSelectMode: () => void;
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onDownloadSelected: () => void;
  downloading?: boolean;
  onDeleteSelected?: () => void;
  deleting?: boolean;
  includeSubfolders: boolean;
  onToggleIncludeSubfolders: (value: boolean) => void;
  onDownloadFolder: () => void;
  hasSubfolders: boolean;
}

export function MultiSelectToolbar({
  selectMode,
  onToggleSelectMode,
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onDownloadSelected,
  downloading,
  onDeleteSelected,
  deleting,
  includeSubfolders,
  onToggleIncludeSubfolders,
  onDownloadFolder,
  hasSubfolders,
}: MultiSelectToolbarProps) {
  const { t } = useLanguage();

  return (
    <View className="flex-row flex-wrap items-center gap-3">
      <Pressable onPress={onToggleSelectMode} className="px-3 py-1.5 rounded-full border border-ink-900/20">
        <Muted className="font-semibold text-ink-700">{selectMode ? t("folder.endSelect") : t("folder.select")}</Muted>
      </Pressable>

      {selectMode ? (
        <>
          <Pressable onPress={selectedCount === totalCount ? onClearSelection : onSelectAll}>
            <Muted className="font-semibold text-brass-700">
              {selectedCount === totalCount
                ? t("folder.clearSelection")
                : t("folder.selectAllCount", { count: totalCount })}
            </Muted>
          </Pressable>
          <Muted className="font-semibold">{t("folder.selectedCount", { count: selectedCount })}</Muted>
          <Button
            label={t("folder.zipDownloadCount", { count: selectedCount })}
            disabled={selectedCount === 0}
            loading={downloading}
            onPress={onDownloadSelected}
          />
          {onDeleteSelected ? (
            <Button
              label={t("folder.deleteSelectedButton")}
              variant="danger"
              disabled={selectedCount === 0}
              loading={deleting}
              onPress={onDeleteSelected}
            />
          ) : null}
        </>
      ) : (
        <View className="flex-row items-center gap-3">
          {hasSubfolders ? (
            <View className="flex-row items-center gap-2">
              <Muted>{t("folder.includeSubfolders")}</Muted>
              <AccentSwitch value={includeSubfolders} onChange={onToggleIncludeSubfolders} />
            </View>
          ) : null}
          <Button label={t("folder.downloadFolder")} variant="primary" loading={downloading} onPress={onDownloadFolder} />
        </View>
      )}
    </View>
  );
}
