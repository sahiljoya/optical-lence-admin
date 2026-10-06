import { apiClient } from "./apiClient";

export const brandApi = {
  getBrands: () => apiClient("/brand/list", "GET"),
  createBrand: (data) => apiClient("/brand/create", "POST", data),
};

export const productApi = {
  createProduct: (data) => apiClient("/product/create", "POST", data),
  updateMatrix: (data) => apiClient("/product/matrix", "POST", data),
  getProducts: (data) => apiClient("/product/list", "POST", data || {}),
  getProductDetail: (id) => apiClient(`/product/detail/${id}`, "GET"),
};

export const warehouseApi = {
  createLocation: (data) => apiClient("/warehouse-location/create", "POST", data),
  getLocations: (data) => apiClient("/warehouse-location/list", "POST", data),
};
