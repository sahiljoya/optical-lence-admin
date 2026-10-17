import { makeRequestAuth, uploadImageApi } from "@/config/apiClient";

export const courierService = {
  getCouriers: () => makeRequestAuth("get", "/admin/courier/list"),
  createCourier: (name, image = "") => makeRequestAuth("post", "/admin/courier/create", { name, image }),
  updateCourier: (courier_id, data) => makeRequestAuth("post", "/admin/courier/update", { courier_id, ...data }),
  uploadImage: (file) => uploadImageApi(file),
};
