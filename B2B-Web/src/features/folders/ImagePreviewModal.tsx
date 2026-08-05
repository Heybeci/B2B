import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { NavArrowIcon } from "../../components/ui/IconGlyphs";
import { Muted } from "../../components/ui/Typography";
import { useLanguage } from "../../i18n/LanguageContext";
import * as downloadFile from "../../lib/download/downloadFile";
import type { FileDto } from "../hotels/types";

interface ImagePreviewModalProps {
  visible: boolean;
  // The navigable set (image-kind files only, in display order) plus the
  // currently active index within it — lets the modal render prev/next
  // slider arrows without knowing anything about the folder it came from.
  files: FileDto[];
  activeIndex: number | null;
  onNavigate: (index: number) => void;
  onClose: () => void;
}

// Image viewer: sized to the image's own natural pixel dimensions (bounded
// by the viewport, never upscaled past real size), close button pinned to
// the image's own corner, and prev/next slider navigation within `files`
// when more than one image is available.
export function ImagePreviewModal({ visible, files, activeIndex, onNavigate, onClose }: ImagePreviewModalProps) {
  const { t } = useLanguage();
  const { width, height } = useWindowDimensions();
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  const activeFile = activeIndex !== null ? (files[activeIndex] ?? null) : null;
  const imageUrl = activeFile ? downloadFile.viewFileUrl(activeFile.id) : null;
  const hasPrev = activeIndex !== null && activeIndex > 0;
  const hasNext = activeIndex !== null && activeIndex < files.length - 1;
  const showArrows = files.length > 1;

  const goPrev = () => {
    if (activeIndex !== null && activeIndex > 0) onNavigate(activeIndex - 1);
  };
  const goNext = () => {
    if (activeIndex !== null && activeIndex < files.length - 1) onNavigate(activeIndex + 1);
  };

  // Measure the image's real pixel size whenever the active image changes —
  // this is what lets the modal size itself to the image instead of always
  // filling the viewport. Image.getSize works on both web and native.
  useEffect(() => {
    if (!imageUrl) {
      setNaturalSize(null);
      return;
    }
    let cancelled = false;
    setNaturalSize(null);
    Image.getSize(
      imageUrl,
      (w, h) => {
        if (!cancelled) setNaturalSize({ width: w, height: h });
      },
      () => {
        // Load failed (or size unknowable) — fall back to a fixed box so the
        // viewer doesn't hang on a spinner forever; the <Image> itself will
        // still attempt to render (and show a broken-image state) inside it.
        if (!cancelled) setNaturalSize({ width: 480, height: 360 });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  // Left/Right arrow keyboard navigation, Escape to close — web only (no
  // native keyboard to bind here).
  useEffect(() => {
    if (!visible || Platform.OS !== "web") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, activeIndex, files.length]);

  // Bound the display size to the viewport (leaving breathing room so the
  // corner close button/arrows/filename overlay stay on-screen), but never
  // upscale past the image's own natural size — small images show at their
  // real size instead of being stretched to fill the screen.
  const maxW = width * 0.88;
  const maxH = height * 0.85;
  let displayWidth = naturalSize?.width ?? 0;
  let displayHeight = naturalSize?.height ?? 0;
  if (naturalSize && (displayWidth > maxW || displayHeight > maxH)) {
    const scale = Math.min(maxW / displayWidth, maxH / displayHeight);
    displayWidth = displayWidth * scale;
    displayHeight = displayHeight * scale;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop fills entire viewport, tapping empty areas closes. */}
      <Pressable
        style={StyleSheet.absoluteFill}
        className="bg-black/70 items-center justify-center"
        onPress={onClose}
      >
        {/* Inner Pressable is sized to the image itself (no absoluteFill), so
            only taps on the image are swallowed — taps on the surrounding
            letterbox area still reach this backdrop's onClose. */}
        {imageUrl ? (
          <Pressable onPress={() => {}}>
            {naturalSize ? (
              <View style={{ width: displayWidth, height: displayHeight }}>
                <Image
                  source={{ uri: imageUrl }}
                  resizeMode="contain"
                  style={{ width: "100%", height: "100%" }}
                />

                {/* Close button — pinned to the image's own top-right corner,
                    not the viewport's. */}
                <Pressable
                  onPress={onClose}
                  accessibilityLabel={t("common.close")}
                  className="absolute w-8 h-8 rounded-full bg-black/60 items-center justify-center"
                  style={{ top: -12, right: -12 }}
                >
                  <Muted className="text-white text-base font-bold">✕</Muted>
                </Pressable>

                {/* Filename overlay — bottom of the image itself. */}
                {activeFile ? (
                  <View className="absolute bottom-2 left-2 right-2 bg-black/60 rounded px-2 py-1">
                    <Muted numberOfLines={1} className="text-white text-xs font-medium">
                      {activeFile.originalName}
                    </Muted>
                  </View>
                ) : null}

                {/* Prev/next slider arrows — only when the folder has more
                    than one image, and only when there's somewhere to go. */}
                {showArrows && hasPrev ? (
                  <Pressable
                    onPress={goPrev}
                    accessibilityLabel={t("folder.previewPrevious")}
                    className="absolute w-10 h-10 rounded-full bg-black/60 items-center justify-center"
                    style={{ top: "50%", left: -20, marginTop: -20 }}
                  >
                    <NavArrowIcon direction="left" />
                  </Pressable>
                ) : null}
                {showArrows && hasNext ? (
                  <Pressable
                    onPress={goNext}
                    accessibilityLabel={t("folder.previewNext")}
                    className="absolute w-10 h-10 rounded-full bg-black/60 items-center justify-center"
                    style={{ top: "50%", right: -20, marginTop: -20 }}
                  >
                    <NavArrowIcon direction="right" />
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View style={{ width: 200, height: 150 }} className="items-center justify-center">
                <ActivityIndicator color="#fff" />
              </View>
            )}
          </Pressable>
        ) : null}
      </Pressable>
    </Modal>
  );
}
