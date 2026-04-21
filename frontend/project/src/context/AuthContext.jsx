import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = "http://localhost:5002/api/auth";
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,      setUser]      = useState(null);
  const [token,     setToken]     = useState(null);
  const [loading,   setLoading]   = useState(true);   // true while restoring session

  // ── Restore session on refresh ─────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("marine_token");
    if (saved) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${saved}`;
      axios.get(`${API}/me`)
        .then(r => { setUser(r.data.user); setToken(saved); })
        .catch(() => { localStorage.removeItem("marine_token"); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const { data } = await axios.post(`${API}/login`, { email, password });
    localStorage.setItem("marine_token", data.token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    setToken(data.token);
    setUser(data.user);
    return data.user;   // return so caller can redirect based on role
  }, []);

  // ── Register ───────────────────────────────────────────────────────────────
  const register = useCallback(async (name, email, password, role) => {
    const { data } = await axios.post(`${API}/register`, { name, email, password, role });
    localStorage.setItem("marine_token", data.token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    setToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    localStorage.removeItem("marine_token");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
  }, []);

  const isLoggedIn = !!user;

  return (
    <AuthContext.Provider value={{ user, token, isLoggedIn, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};