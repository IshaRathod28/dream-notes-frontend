import axios from "axios";

const BASE = "http://localhost:3005/api/v1";
const headers = { "Content-Type": "application/json", Accept: "application/json" };

export const login = async (email, password) => {
  const res = await axios.post(
    `${BASE}/users/sign_in`,
    { user: { email, password } },
    { headers }
  );
  const token = res.headers["authorization"]?.replace("Bearer ", "");
  return { token, user: res.data.user };
};

export const register = async (email, password) => {
  const res = await axios.post(
    `${BASE}/users`,
    { user: { email, password, password_confirmation: password } },
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
