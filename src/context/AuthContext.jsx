import { createContext, useContext, useState } from "react";
import { login as apiLogin, register as apiRegister, logout as apiLogout } from "../services/authService";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });

  const login = async (email, password) => {
    const data = await apiLogin(email, password);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const register = async (email, password, name) => {
    const data = await apiRegister(email, password, name);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    try { await apiLogout(token); } catch {}
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
  };

  const updateTheme = async (theme) => {
    await api.patch("/preferences", { theme });
    const updatedUser = { ...user, theme };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout, updateTheme, isLoggedIn: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
