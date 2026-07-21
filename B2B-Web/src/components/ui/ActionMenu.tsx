import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Dimensions, Modal, Pressable, View } from "react-native";
import { Card } from "./Card";
import { Body } from "./Typography";
import { ROW_SHADOW } from "../../theme/glass";

export interface ActionMenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  // The trigger visual (e.g. a circle with a KebabIcon). ActionMenu wraps it
  // in its own Pressable, so pass a plain View — not another Pressable, which
  // would swallow the press on native before it reaches the trigger handler.
  children: ReactNode;
}

const MENU_WIDTH = 200;
const ITEM_HEIGHT = 40;
const GAP = 4;

// Cross-platform anchored action menu: pressing the trigger measures its
// on-screen position with RN's measureInWindow (works on both web and
// native, unlike Tooltip.web's getBoundingClientRect) and opens a real RN
// Modal — the same proven top-layer pattern ConfirmDialog/PromptDialog/
// FolderPickerModal already use — but positioned next to the trigger
// instead of centered, flipping above it when there isn't room below.
export function ActionMenu({ items, children }: ActionMenuProps) {
  const triggerRef = useRef<View>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [anchor, setAnchor] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const open = () => {
    const node = triggerRef.current;
    if (!node || typeof node.measureInWindow !== "function") {
      setAnchor(null);
      setIsOpen(true);
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setIsOpen(true);
    });
  };

  const close = () => setIsOpen(false);

  const handleItemPress = (onPress: () => void) => {
    close();
    onPress();
  };

  // Place the menu below the trigger, centered on it horizontally, then
  // clamp/flip so it never leaves the screen.
  const getMenuPosition = () => {
    if (!anchor) return { top: 80, left: 16 };

    const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
    const menuHeight = items.length * ITEM_HEIGHT + 12;

    const fitsBelow = anchor.y + anchor.height + GAP + menuHeight <= screenHeight - 8;
    const top = fitsBelow ? anchor.y + anchor.height + GAP : anchor.y - GAP - menuHeight;

    let left = anchor.x + anchor.width / 2 - MENU_WIDTH / 2;
    left = Math.max(8, Math.min(left, screenWidth - MENU_WIDTH - 8));

    return { top: Math.max(8, top), left };
  };

  const menuPos = getMenuPosition();

  return (
    <>
      <Pressable
        ref={triggerRef}
        hitSlop={6}
        onPress={(e) => {
          // Triggers live inside larger pressable rows (e.g. a folder tree
          // row); opening the menu must not also activate the row.
          e.stopPropagation();
          open();
        }}
      >
        {children}
      </Pressable>

      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={close}>
        {/* Full-screen transparent backdrop — press anywhere outside to close. */}
        <Pressable style={{ flex: 1 }} onPress={close} accessible={false}>
          <Pressable
            style={{
              position: "absolute",
              top: menuPos.top,
              left: menuPos.left,
              width: MENU_WIDTH,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <Card className="p-1.5 gap-0.5" style={ROW_SHADOW}>
              {items.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => handleItemPress(item.onPress)}
                  className="flex-row items-center gap-2.5 px-3 rounded-md"
                  style={({ pressed }) => [
                    { height: ITEM_HEIGHT - 4 },
                    pressed
                      ? { backgroundColor: item.destructive ? "rgba(220,38,38,0.08)" : "rgba(24,21,15,0.06)" }
                      : null,
                  ]}
                >
                  <View className="w-4 items-center justify-center">{item.icon}</View>
                  <Body
                    numberOfLines={1}
                    className={`flex-1 ${item.destructive ? "text-red-600" : "text-ink-700"}`}
                  >
                    {item.label}
                  </Body>
                </Pressable>
              ))}
            </Card>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
