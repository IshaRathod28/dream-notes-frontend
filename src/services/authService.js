import axios from "axios";
//authService.js
const BASE =
  import.meta.env.MODE === "development"
    ? "http://localhost:3005/api/v1"
    : import.meta.env.VITE_API_URL + "/api/v1";const headers = { "Content-Type": "application/json", Accept: "application/json" };

export const login = async (email, password) => {
  const res = await axios.post(
    `${BASE}/users/sign_in`,
    { user: { email, password } },
    { headers }
  );
  const token = res.headers["authorization"]?.replace("Bearer ", "");
  return { token, user: res.data.user };
};

export const register = async (email, password, name) => {
  const res = await axios.post(
    `${BASE}/users`,
    { user: { email, password, password_confirmation: password, name } },
    { headers }
  );
  const token = res.headers["authorization"]?.replace("Bearer ", "");
  return { token, user: res.data.user };
};

export const logout = async (token) => {
  await axios.delete(`${BASE}/users/sign_out`, {
    headers: { ...headers, Authorization: `Bearer ${token}` },
  });
};
