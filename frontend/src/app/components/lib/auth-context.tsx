import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { api, getApiUrl, setAccessToken } from "./api";

export type UserRole = "patient" | "doctor" | "receptionist";

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  clinicId: string;
  doctorId?: string;
  specialization?: string;
  avatarInitials?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (phone: string, password: string, role: UserRole) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_KEY = "cms_user_session";

// Backend roles are capitalized ("Patient"); the UI uses lowercase.
const ROLE_MAP: Record<string, UserRole> = {
  Patient: "patient",
  Doctor: "doctor",
  Receptionist: "receptionist",
};

function initials(name: string) {
  return name
    .replace(/^Dr\.?\s+/i, "")
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function decodeClinicId(token: string): string {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.clinicId ?? "clinic-001";
  } catch {
    return "clinic-001";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {
      localStorage.removeItem(USER_KEY);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(
    async (phone: string, password: string, role: UserRole) => {
      try {
        const data = await api<{ accessToken: string; user: { id: string; fullName: string; role: string } }>(
          "/auth/login",
          { method: "POST", body: { phone, password } }
        );

        const backendRole = ROLE_MAP[data.user.role];
        if (!backendRole) return { success: false, error: "Unknown account role." };

        // Guard: don't let e.g. a doctor sign in through the patient portal.
        if (backendRole !== role) {
          setAccessToken(null);
          return {
            success: false,
            error: `This account is a ${backendRole}. Please use the ${backendRole} login.`,
          };
        }

        setAccessToken(data.accessToken);

        const sessionUser: AuthUser = {
          id: data.user.id,
          name: data.user.fullName,
          phone,
          role: backendRole,
          clinicId: decodeClinicId(data.accessToken),
          doctorId: backendRole === "doctor" ? data.user.id : undefined,
          avatarInitials: initials(data.user.fullName),
        };

        // Best-effort: pull the doctor's specialization for the header/profile.
        if (backendRole === "doctor") {
          try {
            const doc = await api<{ specializationName?: string }>(`/doctors/${data.user.id}`);
            if (doc?.specializationName) sessionUser.specialization = doc.specializationName;
          } catch {
            /* non-fatal */
          }
        }

        setUser(sessionUser);
        localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err?.message ?? "Login failed. Is the backend running?" };
      }
    },
    []
  );

  const logout = useCallback(() => {
    // Revoke the refresh cookie (best-effort), then clear everything locally.
    fetch(`${getApiUrl()}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
    setAccessToken(null);
    setUser(null);
    localStorage.removeItem(USER_KEY);
  }, []);

  return <AuthContext.Provider value={{ user, login, logout, isLoading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
