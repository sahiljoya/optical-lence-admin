import { makeRequestAuth, uploadImageApi } from "@/config/apiClient";

export const courierService = {
  getCouriers: () => makeRequestAuth("get", "/admin/courier/list"),
  createCourier: (name, image = "", rate_per_kg = 0, rate_half_kg = 0) =>
    makeRequestAuth("post", "/admin/courier/create", { name, image, rate_per_kg, rate_half_kg }),
  updateCourier: (courier_id, data) =>
    makeRequestAuth("post", "/admin/courier/update", { courier_id, ...data }),
  getMonthlySummary: (courier, month, year) =>
    makeRequestAuth("get", "/admin/courier/monthly-summary", { courier, month, year }),
  saveReconciliation: (payload) =>
    makeRequestAuth("post", "/admin/courier/reconcile", payload),
  getReconciliationHistory: () =>
    makeRequestAuth("get", "/admin/courier/reconciliation-history"),
  uploadImage: (file) => uploadImageApi(file),
};
