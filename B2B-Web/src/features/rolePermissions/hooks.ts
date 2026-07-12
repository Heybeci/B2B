import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TranslationKey } from "../../i18n/translations";
import { apiClient } from "../../lib/api/client";

// Mirrors B2B.API/Models/Permissions.cs
export const PERMISSIONS = {
  HotelsManage: "hotels.manage",
  HotelsDelete: "hotels.delete",
  HotelsPublish: "hotels.publish",
  UsersManage: "users.manage",
  EmailSettingsManage: "email_settings.manage",
  AuditLogsView: "audit_logs.view",
} as const;

export const PERMISSION_LABEL_KEYS: Record<string, TranslationKey> = {
  [PERMISSIONS.HotelsManage]: "permissions.hotelsManage",
  [PERMISSIONS.HotelsDelete]: "permissions.hotelsDelete",
  [PERMISSIONS.HotelsPublish]: "permissions.hotelsPublish",
  [PERMISSIONS.UsersManage]: "permissions.usersManage",
  [PERMISSIONS.EmailSettingsManage]: "permissions.emailSettingsManage",
  [PERMISSIONS.AuditLogsView]: "permissions.auditLogsView",
};

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

export interface RolePermissionsDto {
  manager: string[];
  staff: string[];
}

export function useRolePermissions() {
  return useQuery({
    queryKey: ["role-permissions"],
    queryFn: async () => (await apiClient.get<RolePermissionsDto>("/role-permissions")).data,
  });
}

export function useUpdateRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: RolePermissionsDto) =>
      (await apiClient.put<RolePermissionsDto>("/role-permissions", input)).data,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["role-permissions"] }),
  });
}
