"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface AuthUser {
  id: string;
  username: string;
}

interface LoginError {
  message: string;
  locked?: boolean;
  retryAfterSeconds?: number;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginModalOpen: boolean;
  tagManagerOpen: boolean;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  openTagManager: () => void;
  closeTagManager: () => void;
  login: (username: string, password: string) => Promise<{ ok: true } | { ok: false; error: LoginError }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchSession(): Promise<AuthUser | null> {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  if (!res.ok) return null;
  const data = (await res.json()) as { authenticated?: false; id?: string; username?: string };
  if (data.authenticated === false || !data.id || !data.username) return null;
  return { id: data.id, username: data.username };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const session = await fetchSession();
      setUser(session);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const session = await fetchSession();
        if (!cancelled) setUser(session);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      await refreshSession();
      return { ok: true as const };
    }

    const body = await res.json().catch(() => ({}));
    const errorCode = body?.error?.code;
    const message =
      body?.error?.message ??
      (res.status === 401 ? "Invalid username or password" : "Login failed");

    if (errorCode === "LOCKED" || res.status === 423) {
      return {
        ok: false as const,
        error: {
          message,
          locked: true,
          retryAfterSeconds: body?.error?.details?.retryAfterSeconds,
        },
      };
    }

    return { ok: false as const, error: { message } };
  }, [refreshSession]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      loginModalOpen,
      tagManagerOpen,
      openLoginModal: () => setLoginModalOpen(true),
      closeLoginModal: () => setLoginModalOpen(false),
      openTagManager: () => setTagManagerOpen(true),
      closeTagManager: () => setTagManagerOpen(false),
      login,
      logout,
      refreshSession,
    }),
    [user, isLoading, loginModalOpen, tagManagerOpen, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
