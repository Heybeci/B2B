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
