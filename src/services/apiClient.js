export const API_BASE_URL = "https://opticale-backend.vercel.app/api/v1/admin";

export const apiClient = async (endpoint, method = "GET", body = null) => {
  const headers = {
    "Content-Type": "application/json",
    // "Authorization": `Bearer ${localStorage.getItem("token")}`
  };

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("API Client Error:", error);
    throw error;
  }
};
