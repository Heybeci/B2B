import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiClient } from "../../lib/api/client";
import { tokenStorage } from "../../lib/auth/tokenStorage";
import type { UserRole } from "../users/hooks";

export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  role: UserRole;
  permissions: string[];
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const access = await tokenStorage.getAccessToken();
      if (!access) {
        setIsLoading(false);
        return;
      }
      try {
        const { data } = await apiClient.get<AuthUser>("/auth/me");
        setUser(data);
      } catch {
        await tokenStorage.clear();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await apiClient.post("/auth/login", { username, password });
    await tokenStorage.setAccessToken(data.accessToken);
    await tokenStorage.setRefreshToken(data.refreshToken);
    setUser(data.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = await tokenStorage.getRefreshToken();
    await apiClient.post("/auth/logout", { refreshToken }).catch(() => undefined);
    await tokenStorage.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
