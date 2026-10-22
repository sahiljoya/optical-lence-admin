import { makeRequestAuth } from "@/config/apiClient";

export const orderApi = {
  getPickQueue: () => makeRequestAuth("get", "/admin/order/pick-queue"),
  getPickList: (id) => makeRequestAuth("get", `/admin/order/${id}/pick-list`),
  advanceStatus: (id, status, trackingNumber, deliveryPartner, dispatchMeta = {}) =>
    makeRequestAuth("post", `/admin/order/${id}/advance-status`, {
      status,
      ...(trackingNumber ? { tracking_number: trackingNumber } : {}),
      ...(deliveryPartner ? { delivery_partner: deliveryPartner } : {}),
      ...(dispatchMeta.cartons_count !== undefined ? { cartons_count: dispatchMeta.cartons_count } : {}),
      ...(dispatchMeta.cartage_charge !== undefined ? { cartage_charge: dispatchMeta.cartage_charge } : {}),
      ...(dispatchMeta.is_cartage_free !== undefined ? { is_cartage_free: dispatchMeta.is_cartage_free } : {}),
      ...(dispatchMeta.cartage_rate_per_carton !== undefined ? { cartage_rate_per_carton: dispatchMeta.cartage_rate_per_carton } : {}),
    }),
  confirmOrder: (orderId, allowPartial) => makeRequestAuth("post", "/admin/order/confirm", { orderId, allowPartial }),
  holdOrder: (orderId) => makeRequestAuth("post", "/admin/order/hold", { orderId }),
  cancelOrder: (orderId) => makeRequestAuth("post", "/admin/order/cancel", { orderId }),
  removeUrgent: (orderId) => makeRequestAuth("post", "/admin/order/remove-urgent", { orderId }),
  createOrder: (data) => makeRequestAuth("post", "/admin/order/create", data),
  getRecentOrders: () => makeRequestAuth("get", "/admin/dashboard/recent-orders"),
};
