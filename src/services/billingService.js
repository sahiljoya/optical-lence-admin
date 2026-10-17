import { makeRequestAuth } from "@/config/apiClient";

export const billingService = {
  getAccounts: () => makeRequestAuth("get", "/admin/billing/accounts"),
  getWeeklyCollections: () => makeRequestAuth("get", "/admin/billing/weekly-collections"),
  addPayment: (data) => makeRequestAuth("post", "/admin/ledger/payment/add", data),
};
