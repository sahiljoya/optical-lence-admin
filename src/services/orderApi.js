import { makeRequestAuth } from "@/config/apiClient";

export const orderApi = {
  getPickQueue: () => makeRequestAuth("get", "/admin/order/pick-queue"),
  getPickList: (id) => makeRequestAuth("get", `/admin/order/${id}/pick-list`),
  advanceStatus: (id, status) => makeRequestAuth("post", `/admin/order/${id}/advance-status`, { status }),
};
