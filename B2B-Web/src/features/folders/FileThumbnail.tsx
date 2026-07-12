import { Image } from "expo-image";
import { View } from "react-native";
import { Muted } from "../../components/ui/Typography";
import { useLanguage } from "../../i18n/LanguageContext";
import { API_URL } from "../../lib/api/client";
import { fileTypeLabel } from "../../lib/format";
import { colors } from "../../theme/colors";
import type { FileDto } from "../hotels/types";

export function fileThumbnailUrl(file: FileDto): string {
  return `${API_URL}/files/${file.id}/download`;
}

// A plain page-with-folded-corner glyph for non-image, non-video files
// (PDFs, docs, etc.) — these previously fell through to the video
// placeholder below and rendered a play button, wrongly implying they were
// playable.
function DocumentGlyph() {
  return (
    <View style={{ width: 26, height: 32 }}>
      <View
        style={{
          width: 26,
          height: 32,
          borderRadius: 3,
          backgroundColor: colors.paper.DEFAULT,
          borderWidth: 1,
          borderColor: "rgba(24,21,15,0.15)",
        }}
      />
      <View
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 0,
          height: 0,
          borderTopWidth: 9,
          borderLeftWidth: 9,
          borderTopColor: "rgba(24,21,15,0.18)",
          borderLeftColor: "transparent",
        }}
      />
      <View style={{ position: "absolute", left: 5, top: 13, width: 16, height: 2, borderRadius: 1, backgroundColor: "rgba(24,21,15,0.25)" }} />
      <View style={{ position: "absolute", left: 5, top: 18, width: 16, height: 2, borderRadius: 1, backgroundColor: "rgba(24,21,15,0.25)" }} />
      <View style={{ position: "absolute", left: 5, top: 23, width: 10, height: 2, borderRadius: 1, backgroundColor: "rgba(24,21,15,0.25)" }} />
    </View>
  );
}

export function FileThumbnail({ file }: { file: FileDto }) {
  const { t } = useLanguage();

  if (file.kind === "image") {
    return (
      <Image
        source={{ uri: fileThumbnailUrl(file) }}
        className="w-full h-full"
        contentFit="cover"
        transition={150}
      />
    );
  }

  if (file.kind === "video") {
    return (
      <View className="w-full h-full items-center justify-center bg-ink-800">
        <View className="w-9 h-9 rounded-full bg-paper/90 items-center justify-center">
          <View
            style={{
              width: 0,
              height: 0,
              borderTopWidth: 7,
              borderBottomWidth: 7,
              borderLeftWidth: 11,
              borderTopColor: "transparent",
              borderBottomColor: "transparent",
              borderLeftColor: colors.ink[900],
              marginLeft: 3,
            }}
          />
        </View>
        <Muted className="mt-2 text-paper/70 text-[10px] uppercase tracking-wider">{t("folder.video")}</Muted>
      </View>
    );
  }

  return (
    <View className="w-full h-full items-center justify-center bg-ink-100">
      <DocumentGlyph />
      <Muted className="mt-2 text-ink-500 text-[10px] uppercase tracking-wider">
        {fileTypeLabel(file.mimeType)}
      </Muted>
    </View>
  );
}
