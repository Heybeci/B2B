import axios from "axios";
import { type TranslateFn } from "../../i18n/LanguageContext";
import { apiClient } from "../../lib/api/client";
import { folderNamesFromSingle } from "./folderName";

export interface DroppedFile {
  // Folder name segments the file was nested under when dropped (e.g.
  // dropping a "2024/Kış" folder onto the zone yields ["2024", "Kış"]).
  // Empty when the file itself was dropped directly (no wrapping folder).
  path: string[];
  file: File;
}

export type UploadItemStatus = "pending" | "uploading" | "done" | "error";

export interface UploadProgressItem {
  id: string; // "folder:a/b" or "file:a/b:name.jpg"
  kind: "folder" | "file";
  name: string;
  path: string[]; // parent folder segments (indentation)
  status: UploadItemStatus;
  error?: string; // translated failure reason, set only when status === "error"
}

function readEntry(entry: FileSystemEntry, path: string[]): Promise<DroppedFile[]> {
  return new Promise((resolve, reject) => {
    if (entry.isFile) {
      (entry as FileSystemFileEntry).file((file) => resolve([{ path, file }]), reject);
      return;
    }
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const collected: FileSystemEntry[] = [];
      // readEntries only returns a batch at a time — it must be called
      // repeatedly until it resolves an empty array to get everything.
      const readNextBatch = () => {
        reader.readEntries((batch) => {
          if (batch.length === 0) {
            Promise.all(collected.map((child) => readEntry(child, [...path, entry.name])))
              .then((groups) => resolve(groups.flat()))
              .catch(reject);
            return;
          }
          collected.push(...batch);
          readNextBatch();
        }, reject);
      };
      readNextBatch();
      return;
    }
    resolve([]);
  });
}

export async function readDataTransferEntries(dataTransfer: DataTransfer): Promise<DroppedFile[]> {
  const items = Array.from(dataTransfer.items);
  const entries = items
    .map((item) => (item.webkitGetAsEntry ? item.webkitGetAsEntry() : null))
    .filter((entry): entry is FileSystemEntry => entry !== null);

  if (entries.length > 0) {
    const groups = await Promise.all(entries.map((entry) => readEntry(entry, [])));
    return groups.flat();
  }

  // Fallback for drag sources that don't expose file-system entries.
  return Array.from(dataTransfer.files).map((file) => ({ path: [], file }));
}

// Derives the full pending-state item list (every folder prefix + every
// file) from the raw drop, before any network call has been made — this is
// what lets the progress modal show the whole tree immediately on drop.
function buildInitialProgressItems(dropped: DroppedFile[]): UploadProgressItem[] {
  const items: UploadProgressItem[] = [];
  const seenFolders = new Set<string>();

  for (const { path } of dropped) {
    for (let i = 1; i <= path.length; i++) {
      const prefix = path.slice(0, i);
      const key = prefix.join("/");
      if (seenFolders.has(key)) continue;
      seenFolders.add(key);
      items.push({
        id: `folder:${key}`,
        kind: "folder",
        name: prefix[prefix.length - 1],
        path: prefix,
        status: "pending",
      });
    }
  }

  for (const { path, file } of dropped) {
    items.push({
      id: `file:${path.join("/")}:${file.name}`,
      kind: "file",
      name: file.name,
      path,
      status: "pending",
    });
  }

  return items;
}

function nextAvailableName(name: string, existingNamesLower: Set<string>): string {
  if (!existingNamesLower.has(name.toLowerCase())) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 1;
  let candidate = `${base} (${i})${ext}`;
  while (existingNamesLower.has(candidate.toLowerCase())) {
    i += 1;
    candidate = `${base} (${i})${ext}`;
  }
  return candidate;
}

// Maps a failed upload-related request to a translated, user-facing message.
// The backend's error JSON is `{ error: "<Turkish message>", code: "<machine
// key or null>" }` — we never show the raw `error` text (violates the
// project's i18n convention, same rule login.tsx already follows), instead
// switching on `code` to a translation key. Unknown/absent code (including
// non-JSON IIS-level rejections, e.g. the request-size cap) falls back to a
// generic message. `mimeType` is only meaningful for the
// "unsupported_mime_type" code and is supplied by the file-upload call site.
function getUploadErrorMessage(err: unknown, t: TranslateFn, mimeType?: string): string {
  const code = axios.isAxiosError(err)
    ? (err.response?.data as { code?: string | null } | undefined)?.code
    : undefined;
  switch (code) {
    case "unsupported_mime_type":
      return mimeType ? t("upload.error.unsupportedType", { mimeType }) : t("upload.error.generic");
    case "content_mismatch":
      return t("upload.error.contentMismatch");
    default:
      return t("upload.error.generic");
  }
}

export type ConflictChoice = "replace" | "copy" | "cancel";

interface UploadDropParams {
  hotelId: number;
  targetFolderId: number | null;
  dataTransfer: DataTransfer;
  // Asked only if at least one dropped file's name already exists in its
  // target folder — the whole batch is resolved with a single choice
  // rather than prompting once per conflicting file.
  confirmConflicts: (conflictCount: number) => Promise<ConflictChoice>;
  // Called after every meaningful state change (folder resolved, file
  // uploading/done/error, ...) with the full current item list so a modal
  // can render live progress instead of a single static "uploading" label.
  onProgress?: (items: UploadProgressItem[]) => void;
  // Used to translate per-item error messages (see getUploadErrorMessage) —
  // this module has no React context of its own, so the caller's `t` from
  // useLanguage() is threaded through explicitly.
  t: TranslateFn;
}

interface ResolvedItem {
  file: File;
  folderId: number | null;
  path: string[];
  progressId: string;
}

// Recursively uploads whatever was dropped (loose files and/or whole folder
// trees), recreating the folder structure via the existing single-level
// create-folder endpoint (there's no bulk/recursive endpoint), then uploading
// files one at a time (one multipart POST per file — see the upload loop
// below for why) grouped by resolved target folder. Folder-name collisions
// merge into the existing folder automatically (harmless — dragging an
// updated "2024" folder onto a hotel that already has one should combine,
// not block). File-name collisions are the only thing that prompts, since
// overwriting a file is the only destructive case here.
//
// Every network call carries a finite timeout and every stage is isolated
// with try/catch: one folder or one file failing marks just that item
// "error" (with a translated reason, surfaced via onProgress) and processing
// continues, rather than silently hanging or aborting the whole drop.
export async function uploadDroppedItems({
  hotelId,
  targetFolderId,
  dataTransfer,
  confirmConflicts,
  onProgress,
  t,
}: UploadDropParams): Promise<{ uploadedCount: number; cancelled: boolean; failedCount: number }> {
  const AXIOS_CONFIG = { timeout: 15_000 };
  const AXIOS_UPLOAD_CONFIG = { timeout: 120_000 };

  const dropped = await readDataTransferEntries(dataTransfer);
  if (dropped.length === 0) return { uploadedCount: 0, cancelled: false, failedCount: 0 };

  const progressMap = new Map<string, UploadProgressItem>();
  for (const item of buildInitialProgressItems(dropped)) progressMap.set(item.id, item);
  const emitProgress = () => onProgress?.(Array.from(progressMap.values()));
  const setItemStatus = (id: string, status: UploadItemStatus, error?: string) => {
    const existing = progressMap.get(id);
    if (existing) progressMap.set(id, { ...existing, status, error });
  };
  const countFailed = () => Array.from(progressMap.values()).filter((i) => i.status === "error").length;
  emitProgress();

  const folderIdCache = new Map<string, number | null>();
  const existingFilesCache = new Map<string, { id: number; nameLower: string }[]>();

  const existingFilesFor = async (folderId: number | null) => {
    const key = folderId === null ? "root" : String(folderId);
    const cached = existingFilesCache.get(key);
    if (cached) return cached;
    const res = await apiClient.get(`/hotels/${hotelId}/browse`, {
      params: folderId ? { folderId } : undefined,
      ...AXIOS_CONFIG,
    });
    const list = (res.data.files as { id: number; originalName: string }[]).map((f) => ({
      id: f.id,
      nameLower: f.originalName.toLowerCase(),
    }));
    existingFilesCache.set(key, list);
    return list;
  };

  const resolveFolderId = async (segments: string[]): Promise<number | null> => {
    if (segments.length === 0) return targetFolderId;
    const key = segments.join(" ");
    const cached = folderIdCache.get(key);
    if (cached !== undefined) return cached;

    const progressId = `folder:${segments.join("/")}`;
    setItemStatus(progressId, "uploading");
    emitProgress();
    try {
      const parentId = await resolveFolderId(segments.slice(0, -1));
      const name = segments[segments.length - 1];
      const res = await apiClient.get(`/hotels/${hotelId}/browse`, {
        params: parentId ? { folderId: parentId } : undefined,
        ...AXIOS_CONFIG,
      });
      const existing = (res.data.folders as { id: number; nameTr: string }[]).find(
        (f) => f.nameTr.toLowerCase() === name.toLowerCase(),
      );
      const id = existing
        ? existing.id
        : (await apiClient.post("/folders", { hotelId, parentFolderId: parentId, ...folderNamesFromSingle(name) }, AXIOS_CONFIG)).data.id;
      folderIdCache.set(key, id);
      setItemStatus(progressId, "done");
      emitProgress();
      return id;
    } catch (err) {
      setItemStatus(progressId, "error", getUploadErrorMessage(err, t));
      emitProgress();
      throw err;
    }
  };

  const resolved: ResolvedItem[] = [];
  for (const item of dropped) {
    const progressId = `file:${item.path.join("/")}:${item.file.name}`;
    try {
      const folderId = await resolveFolderId(item.path);
      resolved.push({ file: item.file, folderId, path: item.path, progressId });
    } catch (err) {
      console.error(err);
      setItemStatus(progressId, "error", getUploadErrorMessage(err, t));
      emitProgress();
    }
  }

  const conflictIndexes = new Set<number>();
  const skipIndexes = new Set<number>();
  for (let i = 0; i < resolved.length; i++) {
    try {
      const existing = await existingFilesFor(resolved[i].folderId);
      if (existing.some((f) => f.nameLower === resolved[i].file.name.toLowerCase())) {
        conflictIndexes.add(i);
      }
    } catch (err) {
      console.error(err);
      skipIndexes.add(i);
      setItemStatus(resolved[i].progressId, "error", getUploadErrorMessage(err, t));
      emitProgress();
    }
  }

  let choice: ConflictChoice = "copy";
  if (conflictIndexes.size > 0) {
    choice = await confirmConflicts(conflictIndexes.size);
    if (choice === "cancel") return { uploadedCount: 0, cancelled: true, failedCount: countFailed() };
  }

  if (choice === "replace") {
    for (const i of conflictIndexes) {
      if (skipIndexes.has(i)) continue;
      try {
        const existing = await existingFilesFor(resolved[i].folderId);
        const match = existing.find((f) => f.nameLower === resolved[i].file.name.toLowerCase());
        if (match) await apiClient.delete(`/files/${match.id}`, AXIOS_CONFIG);
      } catch (err) {
        console.error(err);
        skipIndexes.add(i);
        setItemStatus(resolved[i].progressId, "error", getUploadErrorMessage(err, t));
        emitProgress();
      }
    }
  }

  const finalFiles = resolved
    .map((item, i): ResolvedItem | null => {
      if (skipIndexes.has(i)) return null;
      if (!conflictIndexes.has(i) || choice !== "copy") return item;
      const existingLower = new Set(
        (existingFilesCache.get(item.folderId === null ? "root" : String(item.folderId)) ?? []).map(
          (f) => f.nameLower,
        ),
      );
      const newName = nextAvailableName(item.file.name, existingLower);
      const newFile = new File([item.file], newName, { type: item.file.type });
      const newProgressId = `file:${item.path.join("/")}:${newName}`;
      // Update progress map: delete old id, add new one with updated name
      const oldItem = progressMap.get(item.progressId);
      if (oldItem) {
        progressMap.delete(item.progressId);
        progressMap.set(newProgressId, { ...oldItem, id: newProgressId, name: newName });
      }
      return { ...item, file: newFile, progressId: newProgressId };
    })
    .filter((item): item is ResolvedItem => item !== null);

  const groups = new Map<
    string,
    { folderId: number | null; files: { file: File; progressId: string }[] }
  >();
  for (const item of finalFiles) {
    const key = item.folderId === null ? "root" : String(item.folderId);
    if (!groups.has(key)) groups.set(key, { folderId: item.folderId, files: [] });
    groups.get(key)!.files.push({ file: item.file, progressId: item.progressId });
  }

  // One file per POST rather than batching a whole group into a single
  // multipart request — this is what gives each file independent
  // success/failure instead of one bad file (bad MIME type, oversized,
  // content-mismatch) taking its entire sibling group down with it. Group
  // structure (per resolved target folder) and the sequential loop are
  // otherwise unchanged — no new concurrency introduced.
  let uploadedCount = 0;
  for (const group of groups.values()) {
    for (const b of group.files) {
      setItemStatus(b.progressId, "uploading");
      emitProgress();
      try {
        const form = new FormData();
        if (group.folderId) form.append("folderId", String(group.folderId));
        form.append("files", b.file, b.file.name);
        await apiClient.post(`/hotels/${hotelId}/files`, form, {
          headers: { "Content-Type": "multipart/form-data" },
          ...AXIOS_UPLOAD_CONFIG,
        });
        setItemStatus(b.progressId, "done");
        uploadedCount += 1;
      } catch (err) {
        console.error(err);
        setItemStatus(b.progressId, "error", getUploadErrorMessage(err, t, b.file.type));
      }
      emitProgress();
    }
  }

  return { uploadedCount, cancelled: false, failedCount: countFailed() };
}
