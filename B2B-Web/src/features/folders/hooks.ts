import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";
import type {
  BrowseFolderDto,
  BrowseResponse,
  ChangeHistoryDto,
  FileDto,
  FolderDto,
  GenerateWebOptimizedResultDto,
  TrashListDto,
} from "../hotels/types";
import type { FolderNames } from "./folderName";

export function useCreateFolder(hotelId: number, folderId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (names: FolderNames) =>
      (await apiClient.post("/folders", { hotelId, parentFolderId: folderId, ...names })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", hotelId, "browse", folderId] });
    },
  });
}

export function useDeleteFolder(hotelId: number, parentFolderId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (folderId: number) => apiClient.delete(`/folders/${folderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", hotelId, "browse", parentFolderId] });
    },
  });
}

// The rename/move mutations below all invalidate the wide ["hotels", hotelId]
// prefix rather than one browse key: they're triggered from arbitrary tree/
// grid positions, and a move in particular changes two different browse views
// (source and destination folder) at once — same reasoning as FolderTree's
// own delete mutation.

export function useRenameFolder(hotelId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ folderId, names }: { folderId: number; names: FolderNames }) =>
      (await apiClient.patch(`/folders/${folderId}`, names)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", hotelId] });
    },
  });
}

export function useMoveFolder(hotelId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      folderId,
      newParentFolderId,
    }: {
      folderId: number;
      newParentFolderId: number | null;
    }) => (await apiClient.patch(`/folders/${folderId}/move`, { newParentFolderId })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", hotelId] });
    },
  });
}

export function useRenameFile(hotelId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fileId, originalName }: { fileId: number; originalName: string }) =>
      (await apiClient.patch(`/files/${fileId}`, { originalName })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", hotelId] });
    },
  });
}

export function useMoveFile(hotelId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fileId, folderId }: { fileId: number; folderId: number | null }) =>
      (await apiClient.patch(`/files/${fileId}/move`, { folderId })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", hotelId] });
    },
  });
}

export function useUploadFiles(hotelId: number, folderId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (form: FormData) =>
      (
        await apiClient.post(`/hotels/${hotelId}/files`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", hotelId, "browse", folderId] });
    },
  });
}

export function useDeleteFile(hotelId: number, folderId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileId: number) => apiClient.delete(`/files/${fileId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", hotelId, "browse", folderId] });
    },
  });
}

export function useBulkDeleteFiles(hotelId: number, folderId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileIds: number[]) => apiClient.post("/files/bulk-delete", { fileIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", hotelId, "browse", folderId] });
    },
  });
}

export function useBulkMoveFiles(hotelId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ fileIds, folderId }: { fileIds: number[]; folderId: number | null }) =>
      (await apiClient.post("/files/bulk-move", { fileIds, folderId })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", hotelId] });
    },
  });
}

// Reorder mutations invalidate the SAME narrow ["hotels", hotelId, "browse",
// <scope>] key useCreateFolder/useDeleteFolder use (unlike rename/move above)
// — a reorder never changes which browse scope an item belongs to, only its
// position within the one scope it's already in, so there's no second view
// to invalidate. `onMutate` writes the new order into that query's cache
// straight away (reusing the already-cached item objects, just resequenced
// by the id list the drag produced) so the grid/tree doesn't wait on the
// round-trip; `onSuccess`'s invalidation reconciles with the server after
// (and corrects things if a race made the optimistic guess wrong).

export function useReorderFolders(hotelId: number, parentFolderId: number | null) {
  const queryClient = useQueryClient();
  const queryKey = ["hotels", hotelId, "browse", parentFolderId];
  return useMutation({
    mutationFn: async (orderedIds: number[]) =>
      apiClient.patch("/folders/reorder", { hotelId, parentFolderId, orderedIds }),
    onMutate: (orderedIds: number[]) => {
      queryClient.setQueryData<BrowseResponse>(queryKey, (old) => {
        if (!old) return old;
        const byId = new Map(old.folders.map((f) => [f.id, f]));
        const reordered = orderedIds
          .map((id) => byId.get(id))
          .filter((f): f is BrowseFolderDto => f !== undefined);
        return { ...old, folders: reordered };
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// --- Trash + change history (soft-delete/undo) ------------------------------
// Mirrors the rename/move mutations above: restore/purge/undo all touch an
// arbitrary browse scope (whatever folder the entity is restored into, or
// used to live in), so they invalidate the same wide ["hotels", hotelId]
// prefix rather than one narrow browse key. `useTrash`/`useChangeHistory`
// take an `enabled` flag (same optional-default-true shape as
// `useBrowseHotel`) so the modal that owns them can skip the request while
// it's closed.

export function useTrash(hotelId: number, enabled = true) {
  return useQuery({
    queryKey: ["hotels", hotelId, "trash"],
    queryFn: async () => (await apiClient.get<TrashListDto>("/trash", { params: { hotelId } })).data,
    enabled,
  });
}

export function useRestoreFolder(hotelId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (folderId: number) =>
      (await apiClient.post<FolderDto>(`/trash/folders/${folderId}/restore`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", hotelId] });
    },
  });
}

export function useRestoreFile(hotelId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileId: number) => (await apiClient.post<FileDto>(`/trash/files/${fileId}/restore`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", hotelId] });
    },
  });
}

export function usePurgeFolder(hotelId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (folderId: number) => apiClient.delete(`/trash/folders/${folderId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", hotelId] });
    },
  });
}

export function usePurgeFile(hotelId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileId: number) => apiClient.delete(`/trash/files/${fileId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", hotelId] });
    },
  });
}

export function useChangeHistory(hotelId: number, enabled = true) {
  return useQuery({
    queryKey: ["hotels", hotelId, "history"],
    queryFn: async () =>
      (
        await apiClient.get<ChangeHistoryDto[]>("/history", {
          params: { hotelId, page: 1, pageSize: 50 },
        })
      ).data,
    enabled,
  });
}

export function useUndoChange(hotelId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (historyId: number) => (await apiClient.post(`/history/${historyId}/undo`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels", hotelId] });
    },
  });
}

// Backfills web-optimized copies for pre-existing images directly in a
// folder (new uploads already get one automatically — see plan.md). No cache
// invalidation: the operation doesn't change what's visible in any browse
// listing, only which bytes /files/{id}/view happens to resolve to behind
// the scenes — the caller shows the returned counts in a toast instead.
export function useGenerateWebOptimizedImages(hotelId: number, folderId: number | null) {
  return useMutation({
    mutationFn: async () =>
      (
        await apiClient.post<GenerateWebOptimizedResultDto>("/files/generate-web-optimized", {
          hotelId,
          folderId,
        })
      ).data,
  });
}

export function useReorderFiles(hotelId: number, folderId: number | null) {
  const queryClient = useQueryClient();
  const queryKey = ["hotels", hotelId, "browse", folderId];
  return useMutation({
    mutationFn: async (orderedIds: number[]) =>
      apiClient.patch("/files/reorder", { hotelId, folderId, orderedIds }),
    onMutate: (orderedIds: number[]) => {
      queryClient.setQueryData<BrowseResponse>(queryKey, (old) => {
        if (!old) return old;
        const byId = new Map(old.files.map((f) => [f.id, f]));
        const reordered = orderedIds
          .map((id) => byId.get(id))
          .filter((f): f is FileDto => f !== undefined);
        return { ...old, files: reordered };
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
