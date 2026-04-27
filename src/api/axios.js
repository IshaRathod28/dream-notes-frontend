import axios from "axios";

// Base API configuration for Rails backend
const api = axios.create({
  baseURL: "http://localhost:3005/api/v1",
  headers: {
    "Content-Type": "application/json"
  }
});

export default api;