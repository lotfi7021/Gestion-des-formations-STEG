import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import {
  login as apiLogin,
  getProfile,
  logout as apiLogout,
  type User,
  type LoginDto,
} from "../lib/api/auth";
import {
  setTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isTokenExpired,
  tryRefreshToken,
} from "../lib/api/client";

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (dto: LoginDto) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token = getAccessToken();
      const refreshToken = getRefreshToken();
      if (!token && !refreshToken) {
        setIsLoading(false);
        return;
      }

      if (!token && refreshToken) {
        if (isTokenExpired(refreshToken)) {
          clearTokens();
          setIsLoading(false);
          return;
        }
        const ok = await tryRefreshToken();
        if (!ok) {
          setIsLoading(false);
          return;
        }
      }

      try {
        const profile = await getProfile();
        setUser(profile);
      } catch {
        clearTokens();
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = useCallback(async (dto: LoginDto) => {
    const res = await apiLogin(dto);
    setTokens(res.access_token, res.refresh_token);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch {
      // ignore errors
    }
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
