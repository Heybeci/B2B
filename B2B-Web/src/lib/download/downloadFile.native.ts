import { Linking } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { API_URL } from "../api/client";

async function downloadAndShare(url: string, fileName: string) {
  const dest = `${FileSystem.cacheDirectory}${fileName}`;
  const { uri } = await FileSystem.downloadAsync(url, dest);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri);
  }
  return uri;
}

export async function downloadSingleFile(fileId: number, originalName: string) {
  await downloadAndShare(`${API_URL}/files/${fileId}/download`, originalName);
}

export function viewFileUrl(fileId: number): string {
  return `${API_URL}/files/${fileId}/view`;
}

export async function viewFile(fileId: number) {
  await Linking.openURL(viewFileUrl(fileId));
}

export async function downloadZip(body: {
  hotelId: number;
  fileIds?: number[];
  folderId?: number;
  includeSubfolders?: boolean;
}) {
  const params = new URLSearchParams({ hotelId: String(body.hotelId) });
  if (body.fileIds?.length) params.set("fileIds", body.fileIds.join(","));
  if (body.folderId) params.set("folderId", String(body.folderId));
  if (body.includeSubfolders !== undefined) params.set("includeSubfolders", String(body.includeSubfolders));

  await downloadAndShare(`${API_URL}/download/zip?${params.toString()}`, `indirilenler-${Date.now()}.zip`);
}
