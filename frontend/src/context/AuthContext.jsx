import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiDemoLogin, apiMe } from "../api";

const AuthContext = createContext(null);
const TOKEN_KEY = "sigip-demo-token";

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => sessionStorage.getItem(TOKEN_KEY) || "",
  );
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(Boolean(token));

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken("");
    setProfile(null);
  }, []);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiMe(token)
      .then((data) => {
        if (!cancelled) setProfile(data.profile);
      })
      .catch(() => {
        if (!cancelled) logout();
      })
      .finally(() => {
        if (!cancelled) setLoadingProfile(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const loginDemo = useCallback(async (userId) => {
    const data = await apiDemoLogin(userId);
    sessionStorage.setItem(TOKEN_KEY, data.accessToken);
    setToken(data.accessToken);
    setProfile(data.profile);
    setLoadingProfile(false);
    return data;
  }, []);

  const value = useMemo(
    () => ({ token, profile, loadingProfile, loginDemo, logout }),
    [token, profile, loadingProfile, loginDemo, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return value;
}
