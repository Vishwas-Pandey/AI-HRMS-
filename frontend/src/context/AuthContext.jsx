import { createContext, useCallback, useContext, useEffect, useState } from "react";
import api, { tokenStore } from "../lib/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // "checking" while we validate a stored token on first load.
  const [status, setStatus] = useState(tokenStore.get() ? "checking" : "ready");

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const { data } = await api.get("/auth/me");
    setUser(data);
    return data;
  }, []);

  useEffect(() => {
    if (tokenStore.get()) {
      refreshUser()
        .catch(logout)
        .finally(() => setStatus("ready"));
    }
    const onUnauthorized = () => setUser(null);
    window.addEventListener("hrms:unauthorized", onUnauthorized);
    return () => window.removeEventListener("hrms:unauthorized", onUnauthorized);
  }, [refreshUser, logout]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    const { token, ...session } = data;
    tokenStore.set(token);
    setUser(session);
    return session;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, status, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
