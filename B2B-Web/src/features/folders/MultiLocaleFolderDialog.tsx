import { useEffect, useState } from "react";
import { Modal, View } from "react-native";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Muted, SectionTitle } from "../../components/ui/Typography";
import type { FolderNames } from "./folderName";
import { FolderNameFields } from "./FolderNameFields";

interface MultiLocaleFolderDialogProps {
  visible: boolean;
  title: string;
  initialValue: FolderNames;
  submitLabel: string;
  cancelLabel: string;
  onSubmit: (names: FolderNames) => void;
  onCancel: () => void;
  loading?: boolean;
  error?: string | null;
}

export function MultiLocaleFolderDialog({
  visible,
  title,
  initialValue,
  submitLabel,
  cancelLabel,
  onSubmit,
  onCancel,
  loading,
  error,
}: MultiLocaleFolderDialogProps) {
  const [value, setValue] = useState<FolderNames>(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const submit = () => {
    if (value.nameTr.trim()) onSubmit(value);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/40 px-4">
        <Card className="p-5 gap-4 max-w-sm w-full">
          <SectionTitle>{title}</SectionTitle>
          <FolderNameFields value={value} onChange={setValue} disabled={loading} />
          {error ? <Muted className="text-red-600">{error}</Muted> : null}
          <View className="flex-row gap-2 justify-end">
            <Button label={cancelLabel} variant="ghost" onPress={onCancel} disabled={loading} />
            <Button
              label={submitLabel}
              variant="primary"
              onPress={submit}
              loading={loading}
              disabled={!value.nameTr.trim()}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
