import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

export function useCreateFolder(hotelId: number, folderId: number | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) =>
      (await apiClient.post("/folders", { hotelId, parentFolderId: folderId, name })).data,
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
    mutationFn: async ({ folderId, name }: { folderId: number; name: string }) =>
      (await apiClient.patch(`/folders/${folderId}`, { name })).data,
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
