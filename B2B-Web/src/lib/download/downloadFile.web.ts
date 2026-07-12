import { API_URL } from "../api/client";

// Customer downloads are unauthenticated, so the browser can hit the URL
// directly — no need to fetch a blob first, the server sets Content-Disposition.
export function downloadFileUrl(fileId: number): string {
  return `${API_URL}/files/${fileId}/download`;
}

export function triggerDownload(url: string, suggestedName?: string) {
  const link = document.createElement("a");
  link.href = url;
  if (suggestedName) link.download = suggestedName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function downloadSingleFile(fileId: number, originalName: string) {
  triggerDownload(downloadFileUrl(fileId), originalName);
}

export function viewFileUrl(fileId: number): string {
  return `${API_URL}/files/${fileId}/view`;
}

export async function viewFile(fileId: number) {
  window.open(viewFileUrl(fileId), "_blank", "noopener,noreferrer");
}

export async function downloadZip(body: {
  hotelId: number;
  fileIds?: number[];
  folderId?: number;
  includeSubfolders?: boolean;
}) {
  const res = await fetch(`${API_URL}/download/zip`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error("Zip download failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  triggerDownload(url, `indirilenler-${Date.now()}.zip`);
  URL.revokeObjectURL(url);
}
