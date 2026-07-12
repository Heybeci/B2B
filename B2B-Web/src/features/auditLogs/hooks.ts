import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/api/client";
import type { UserRole } from "../users/hooks";

export interface AuditLogDto {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
  action: string;
  entityType: string | null;
  entityId: number | null;
  details: string | null;
  statusCode: number;
  createdAt: string;
}

export function useAuditLogs(page: number) {
  return useQuery({
    queryKey: ["audit-logs", page],
    queryFn: async () => (await apiClient.get<AuditLogDto[]>("/audit-logs", { params: { page } })).data,
  });
}
