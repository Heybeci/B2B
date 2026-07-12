import { Modal, View } from "react-native";
import { Button } from "./Button";
import { Card } from "./Card";
import { Body, SectionTitle } from "./Typography";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

// Shared "are you sure" dialog — same shape as the duplicate-file conflict
// modal in AdminFolderToolbar (a real RN Modal that portals above
// everything, not an absolutely-positioned overlay scoped to whatever
// component renders it, since that only covers that component's own box).
// The confirm button uses Button's existing `danger` variant rather than a
// className override, since Card/Button's base className can't reliably be
// overridden by an appended className string (generated-stylesheet order,
// not JSX order, decides the winner here — a known trap in this codebase).
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  loading,
}: ConfirmDialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/40 px-4">
        <Card className="p-5 gap-4 max-w-sm w-full">
          <SectionTitle>{title}</SectionTitle>
          <Body>{message}</Body>
          <View className="flex-row gap-2 justify-end">
            <Button label={cancelLabel} variant="ghost" onPress={onCancel} disabled={loading} />
            <Button label={confirmLabel} variant="danger" onPress={onConfirm} loading={loading} />
          </View>
        </Card>
      </View>
    </Modal>
  );
}
