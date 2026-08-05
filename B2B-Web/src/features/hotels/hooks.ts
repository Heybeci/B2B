import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_URL } from "../../lib/api/client";
import type { BrowseResponse, HotelDto } from "./types";

export function hotelLogoUrl(hotel: Pick<HotelDto, "logoFile">): string | null {
  return hotel.logoFile ? `${API_URL}/files/${hotel.logoFile.id}/download` : null;
}

export function useHotels() {
  return useQuery({
    queryKey: ["hotels", "public"],
    queryFn: async () => (await apiClient.get<HotelDto[]>("/hotels")).data,
  });
}

export function useAdminHotels() {
  return useQuery({
    queryKey: ["hotels", "admin"],
    queryFn: async () => (await apiClient.get<HotelDto[]>("/hotels/admin/all")).data,
  });
}

export function useHotel(hotelId: number | undefined) {
  return useQuery({
    queryKey: ["hotels", hotelId],
    queryFn: async () => (await apiClient.get<HotelDto>(`/hotels/${hotelId}`)).data,
    enabled: hotelId !== undefined,
  });
}

export function useBrowseHotel(hotelId: number | undefined, folderId: number | null, enabled = true) {
  return useQuery({
    queryKey: ["hotels", hotelId, "browse", folderId],
    queryFn: async () =>
      (
        await apiClient.get<BrowseResponse>(`/hotels/${hotelId}/browse`, {
          params: folderId ? { folderId } : undefined,
        })
      ).data,
    enabled: hotelId !== undefined && enabled,
  });
}

export function useCreateHotel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (form: FormData) =>
      (
        await apiClient.post<HotelDto>("/hotels", form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
      ).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
    },
  });
}

export function useUpdateHotel(hotelId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name?: string;
      description?: string;
      isPublished?: boolean;
      sortOrder?: number;
    }) => (await apiClient.patch<HotelDto>(`/hotels/${hotelId}`, input)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
    },
  });
}

export function useDeleteHotel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (hotelId: number) => apiClient.delete(`/hotels/${hotelId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
    },
  });
}

export function useRemoveHotelLogo(hotelId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => apiClient.delete(`/hotels/${hotelId}/logo`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
    },
  });
}
