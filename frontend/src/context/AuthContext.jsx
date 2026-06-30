/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from "react";

const STORAGE_KEY = "mspr_user";
const STORAGE_HAS2FA = "mspr_has2fa";

const AuthContext = createContext(null);

function readStoredAuth() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const stored2fa = localStorage.getItem(STORAGE_HAS2FA);
    return {
      user: stored || null,
      has2FA: stored2fa === "true" ? true : stored2fa === "false" ? false : null,
    };
  } catch {
    return { user: null, has2FA: null };
  }
}

export function AuthProvider({ children }) {
  const [storedAuth] = useState(readStoredAuth);
  const [user, setUser] = useState(storedAuth.user);
  const [has2FA, setHas2FA] = useState(storedAuth.has2FA);

  const [show2FANotice, setShow2FANotice] = useState(false);

  const setLoggedIn = (username, has2FAValue) => {
    const name = (username || "").trim();
    setUser(name || null);
    const value = has2FAValue === true ? true : (has2FAValue === false || has2FAValue == null) ? false : null;
    setHas2FA(value);
    if (value === false) setShow2FANotice(true);
    try {
      if (name) {
        localStorage.setItem(STORAGE_KEY, name);
        if (value !== null) localStorage.setItem(STORAGE_HAS2FA, String(value));
        else localStorage.removeItem(STORAGE_HAS2FA);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_HAS2FA);
      }
    } catch {
      // localStorage may be unavailable in restricted browser contexts.
    }
  };

  const clearUser = () => {
    setUser(null);
    setHas2FA(null);
    setShow2FANotice(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_HAS2FA);
    } catch {
      // localStorage may be unavailable in restricted browser contexts.
    }
  };

  const clear2FANotice = () => setShow2FANotice(false);

  return (
    <AuthContext.Provider value={{ user, has2FA, show2FANotice, setLoggedIn, clearUser, clear2FANotice }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
