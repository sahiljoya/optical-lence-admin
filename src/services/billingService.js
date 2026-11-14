import { makeRequestAuth } from "@/config/apiClient";

export const billingService = {
  getAccounts: (params = {}) => makeRequestAuth("get", "/admin/billing/accounts", params),
  getWeeklyCollections: () => makeRequestAuth("get", "/admin/billing/weekly-collections"),
  addPayment: (data) => makeRequestAuth("post", "/admin/ledger/payment/add", data),
  exportDues: (data = {}) => makeRequestAuth("post", "/admin/billing/dues-export", data),
};
