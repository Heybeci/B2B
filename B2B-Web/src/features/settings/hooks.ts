import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";

export interface EmailSettingsDto {
  smtpHost: string;
  smtpPort: number;
  smtpUsername: string;
  hasPassword: boolean;
  fromAddress: string;
  fromName: string;
  enableSsl: boolean;
}

export function useEmailSettings() {
  return useQuery({
    queryKey: ["email-settings"],
    queryFn: async () => (await apiClient.get<EmailSettingsDto>("/settings/email")).data,
  });
}

export function useUpdateEmailSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      smtpHost: string;
      smtpPort: number;
      smtpUsername: string;
      smtpPassword?: string;
      fromAddress: string;
      fromName: string;
      enableSsl: boolean;
    }) => (await apiClient.put<EmailSettingsDto>("/settings/email", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["email-settings"] }),
  });
}
