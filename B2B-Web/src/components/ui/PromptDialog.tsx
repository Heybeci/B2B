import { useEffect, useState } from "react";
import { Modal, View } from "react-native";
import { Button } from "./Button";
import { Card } from "./Card";
import { Input } from "./Input";
import { Body, SectionTitle } from "./Typography";

interface PromptDialogProps {
  visible: boolean;
  title: string;
  initialValue: string;
  placeholder?: string;
  submitLabel: string;
  cancelLabel: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
  loading?: boolean;
  // Fixed, non-editable text rendered after the input (e.g. a file's ".jpg"
  // extension during rename). The input and onSubmit only ever carry the
  // editable part — re-appending the suffix is the caller's job. Folder
  // rename simply omits this and keeps the whole name editable.
  suffix?: string;
}

// ConfirmDialog's shape (real RN Modal that portals above everything — see
// the comment there for why an absolutely-positioned overlay won't do), but
// with a controlled text input instead of a static message. Shared by both
// folder-rename and file-rename rather than two near-identical dialogs.
export function PromptDialog({
  visible,
  title,
  initialValue,
  placeholder,
  submitLabel,
  cancelLabel,
  onSubmit,
  onCancel,
  loading,
  suffix,
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue);

  // Re-seed the input each time the dialog opens (possibly for a different
  // item) — the component stays mounted across opens, so state alone would
  // keep whatever the previous edit left behind.
  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const trimmed = value.trim();
  const submit = () => {
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/40 px-4">
        <Card className="p-5 gap-4 max-w-sm w-full">
          <SectionTitle>{title}</SectionTitle>
          <View className="flex-row items-center gap-2">
            <View className="flex-1">
              <Input
                value={value}
                onChangeText={setValue}
                placeholder={placeholder}
                autoFocus
                onSubmitEditing={submit}
              />
            </View>
            {suffix ? (
              // Style via `style`, not appended className — Body already sets
              // a text color and stylesheet order decides className conflicts.
              <Body style={{ color: "#8C8271" }}>{suffix}</Body>
            ) : null}
          </View>
          <View className="flex-row gap-2 justify-end">
            <Button label={cancelLabel} variant="ghost" onPress={onCancel} disabled={loading} />
            <Button
              label={submitLabel}
              variant="primary"
              onPress={submit}
              loading={loading}
              disabled={!trimmed}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
