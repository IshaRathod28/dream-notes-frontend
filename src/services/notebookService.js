import api from "../api/axios";

// Fetch all notebooks from backend API
export const getNotebooks = async () => {
  try {
    const response = await api.get("/notebooks");
    return response.data;
  } catch (error) {
    console.error("Error fetching notebooks:", error);
    throw error;
  }
};