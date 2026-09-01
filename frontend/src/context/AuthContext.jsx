import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiLogin, apiMe, apiSelectAccount } from "../api";

const AuthContext = createContext(null);

const PERSIST_KEY = "mesa-atencion-token";
const SESSION_KEY = "mesa-atencion-token-session";

function getStoredToken() {
  return localStorage.getItem(PERSIST_KEY) || sessionStorage.getItem(SESSION_KEY);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [profile, setProfile] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [preAuthToken, setPreAuthToken] = useState("");
  const [remember, setRemember] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(Boolean(getStoredToken()));

  useEffect(() => {
    if (!token) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    let cancelled = false;
    setLoadingProfile(true);

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
  }, [token]);

  const login = useCallback(async ({ document, password, remember: shouldRemember }) => {
    const data = await apiLogin({ document, password, remember: shouldRemember });
    setRemember(Boolean(shouldRemember));
    setAccounts(data.accounts || []);
    setPreAuthToken(data.preAuthToken || "");
    return data;
  }, []);

  const selectAccount = useCallback(
    async (accountId) => {
      const data = await apiSelectAccount({ preAuthToken, accountId });
      const accessToken = data.accessToken;
      setToken(accessToken);
      setProfile(data.profile);

      if (remember) {
        localStorage.setItem(PERSIST_KEY, accessToken);
        sessionStorage.removeItem(SESSION_KEY);
      } else {
        sessionStorage.setItem(SESSION_KEY, accessToken);
        localStorage.removeItem(PERSIST_KEY);
      }

      setAccounts([]);
      setPreAuthToken("");
      return data;
    },
    [preAuthToken, remember]
  );

  const logout = useCallback(() => {
    setToken("");
    setProfile(null);
    setAccounts([]);
    setPreAuthToken("");
    localStorage.removeItem(PERSIST_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const value = useMemo(
    () => ({
      token,
      profile,
      accounts,
      preAuthToken,
      loadingProfile,
      login,
      selectAccount,
      logout,
      setAccounts,
      setPreAuthToken
    }),
    [token, profile, accounts, preAuthToken, loadingProfile, login, selectAccount, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
