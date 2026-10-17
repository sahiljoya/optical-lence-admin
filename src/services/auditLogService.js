import { makeRequestAuth } from "@/config/apiClient";

export const auditLogService = {
  getLogs: (params = {}) => makeRequestAuth("get", "/admin/audit-logs", params),
};
