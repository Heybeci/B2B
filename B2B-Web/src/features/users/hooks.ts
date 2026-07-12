import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

export type UserRole = "admin" | "manager" | "staff";

export interface UserDto {
  id: number;
  username: string;
  email: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => (await apiClient.get<UserDto[]>("/users")).data,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      username: string;
      email: string;
      password: string;
      displayName: string;
      role: UserRole;
    }) => (await apiClient.post<UserDto>("/users", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useToggleUserActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) =>
      (await apiClient.patch<UserDto>(`/users/${id}`, { isActive })).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      displayName?: string;
      email?: string;
      role?: UserRole;
      password?: string;
    }) => (await apiClient.patch<UserDto>(`/users/${id}`, input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}
