export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = -1;
  do {
    value /= 1024;
    unitIndex++;
  } while (value >= 1024 && unitIndex < units.length - 1);
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function fileTypeLabel(mimeType: string): string {
  const subtype = mimeType.split("/")[1] ?? mimeType;
  if (subtype === "quicktime") return "MOV";
  if (subtype === "jpeg") return "JPG";
  return subtype.toUpperCase();
}
