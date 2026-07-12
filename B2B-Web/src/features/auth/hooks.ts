import { useMutation } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      await apiClient.post("/auth/forgot-password", { email });
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (input: { token: string; newPassword: string }) => {
      await apiClient.post("/auth/reset-password", input);
    },
  });
}
