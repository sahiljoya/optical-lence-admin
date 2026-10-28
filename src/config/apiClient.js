import axios from "axios";
import { handleResponse } from "./authService";
import { getItem } from "@/services/storage";

// const BACKEND_URL = "https://opticale-backend.onrender.com/api/v1";
const BACKEND_URL = "http://localhost:8080/api/v1";

/**
 * Make an unauthenticated API request
 * @param {"get"|"post"|"put"|"delete"} method
 * @param {string} url
 * @param {Object} data
 * @param {Object} headers
 * @param {boolean} isFile
 */
export const makeRequest = async (
  method,
  url,
  data = {},
  headers = {},
  isFile = false
) => {
  try {
    const config = {
      method: method.toLowerCase(),
      url: `${BACKEND_URL}${url}`,
      headers: {
        ...(!isFile && { "Content-Type": "application/json" }),
        ...headers,
      },
    };

    if (method.toLowerCase() === "get") {
      config.params = data;
    } else {
      config.data = data;
    }

    const response = await axios(config);
    return handleResponse(response.data);
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Request failed";

    throw new Error(message);
  }
};

export const makeRequestAuth = async (
  method,
  url,
  data = {},
  isFile = false
) => {
  try {
    const token = getItem("admin_token");

    if (!token) {
      throw new Error("Token not found. Please login again.");
    }

    const config = {
      method: method.toLowerCase(),
      url: `${BACKEND_URL}${url}`,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(!isFile && { "Content-Type": "application/json" }),
      },
    };

    if (method.toLowerCase() === "get") {
      config.params = data;
    } else {
      config.data = data;
    }

    const response = await axios(config);
    return handleResponse(response.data);
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Request failed";

    throw new Error(message);
  }
};

export const uploadFiles = async ({
  files = [],
  endpoint = "/uploadImage",
  fieldName = "files",
  isMultiple = true,
}) => {
  if (!files.length) {
    throw new Error("No file selected.");
  }

  const token = getItem("admin_token");

  if (!token) {
    throw new Error("Token not found. Please login again.");
  }

  const formData = new FormData();

  if (isMultiple) {
    files.forEach((file) => {
      formData.append(fieldName, file);
    });
  } else {
    formData.append(fieldName, files[0]);
  }

  try {
    const response = await axios.post(`${BACKEND_URL}${endpoint}`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return handleResponse(response.data);
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Upload failed";

    throw new Error(message);
  }
};

/**
 * Dedicated single image upload function
 * Calls POST /uploadImage and returns uploaded image data (imageUrl, imageName)
 * @param {File} file - Image file object to upload
 */
export const uploadImageApi = async (file) => {
  if (!file) {
    throw new Error("No image file selected.");
  }

  const token = getItem("admin_token");
  if (!token) {
    throw new Error("Token not found. Please login again.");
  }

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await axios.post(`${BACKEND_URL}/uploadImage`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return handleResponse(response.data);
  } catch (error) {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Image upload failed";

    throw new Error(message);
  }
};
