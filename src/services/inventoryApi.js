import { makeRequestAuth } from "@/config/apiClient";

export const inventoryApi = {
  getLowStockAlerts: () => makeRequestAuth("get", "/admin/inventory/low-stock-alerts"),
  receiveStock: (data) => makeRequestAuth("post", "/admin/inventory/receive-stock", data),
  refillStock: (data) => makeRequestAuth("post", "/admin/inventory/refill-stock", data),
  freezeForCount: (data) => makeRequestAuth("post", "/admin/inventory/freeze-count", data),
  submitCount: (data) => makeRequestAuth("post", "/admin/inventory/submit-count", data),
};
