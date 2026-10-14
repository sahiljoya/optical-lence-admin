import { makeRequestAuth } from "@/config/apiClient";

export const brandApi = {
  getBrands: () => makeRequestAuth("get", "/admin/brand/list"),
  createBrand: (data) => makeRequestAuth("post", "/admin/brand/create", data),
};

export const productApi = {
  createProduct: (data) => makeRequestAuth("post", "/admin/product/create", data),
  updateProduct: (id, data) => makeRequestAuth("put", `/admin/product/update/${id}`, data),
  updateMatrix: (data) => makeRequestAuth("post", "/admin/product/matrix", data),
  generateMatrix: (data) => makeRequestAuth("post", "/admin/product/matrix/generate", data),
  findMyLens: (data) => makeRequestAuth("post", "/admin/product/find-my-lens", data),
  getProducts: (data) => makeRequestAuth("post", "/admin/product/list", data || {}),
  getProductDetail: (id) => makeRequestAuth("get", `/admin/product/detail/${id}`),
};

export const warehouseApi = {
  createLocation: (data) => makeRequestAuth("post", "/admin/warehouse-location/create", data),
  getLocations: (data) => makeRequestAuth("post", "/admin/warehouse-location/list", data),
  bulkCreateRack: (data) => makeRequestAuth("post", "/admin/warehouse-location/bulk-create", data),
  getRackSummary: () => makeRequestAuth("get", "/admin/warehouse-location/racks-summary"),
  setRackStatus: (data) => makeRequestAuth("post", "/admin/warehouse-location/rack-status", data),
  deleteRack: (data) => makeRequestAuth("post", "/admin/warehouse-location/rack-delete", data),
};
