import { makeRequestAuth } from "@/config/apiClient";

export const brandApi = {
  getBrands: () => makeRequestAuth("get", "/admin/brand/list"),
  createBrand: (data) => makeRequestAuth("post", "/admin/brand/create", data),
};

export const productApi = {
  createProduct: (data) => makeRequestAuth("post", "/admin/product/create", data),
  updateMatrix: (data) => makeRequestAuth("post", "/admin/product/matrix", data),
  getProducts: (data) => makeRequestAuth("post", "/admin/product/list", data || {}),
  getProductDetail: (id) => makeRequestAuth("get", `/admin/product/detail/${id}`),
};

export const warehouseApi = {
  createLocation: (data) => makeRequestAuth("post", "/admin/warehouse-location/create", data),
  getLocations: (data) => makeRequestAuth("post", "/admin/warehouse-location/list", data),
};
