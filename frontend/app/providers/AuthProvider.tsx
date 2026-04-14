"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "captain" | "depo_manager" | "ops_manager";

type AuthState = {
  token: string | null;
  role: Role | null;
  mobile: string | null;
};

type AuthContextValue = {
  auth: AuthState;
  setAuthState: (s: AuthState) => void;
  login: (token: string, role: Role, mobile: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "captain_attendance_auth";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ token: null, role: null, mobile: null });
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setAuth(JSON.parse(raw));
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
    } catch (e) {
      // ignore
    }
  }, [auth]);

  const setAuthState = (s: AuthState) => setAuth(s);

  const login = (token: string, role: Role, mobile: string) => {
    setAuth({ token, role, mobile });
    router.push("/dashboard");
  };

  const logout = () => {
    setAuth({ token: null, role: null, mobile: null });
    localStorage.removeItem(STORAGE_KEY);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ auth, setAuthState, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
