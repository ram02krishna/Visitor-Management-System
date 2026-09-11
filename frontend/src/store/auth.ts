import { create } from "zustand";
import { api, API_BASE } from "../lib/api";
import log from "../lib/logger";


export type UserRole = "admin" | "warden" | "guard" | "host" | "visitor" | "student";

export interface User {

  id: string;
  name: string;
  email: string;
  role: UserRole;
  department_id?: string | null;
  roll_number?: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    name: string,
    departmentId?: string,
    role?: string,
    rollNumber?: string
  ) => Promise<{ requiresVerification: boolean; email?: string }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}


const PROFILE_CACHE_KEY = "vms_user_profile";
const TOKEN_KEY = "vms_token";

function readProfileCache(): User | null {
  try {
    const raw = localStorage.getItem(PROFILE_CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeProfileCache(user: User) {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(user));
  } catch {
  }
}

function clearCaches() {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: readProfileCache(),
  isAuthenticated: !!localStorage.getItem(TOKEN_KEY) && !!readProfileCache(),
  isLoading: !!localStorage.getItem(TOKEN_KEY) && !readProfileCache(),
  error: null,

  refreshProfile: async () => {
    const currentUser = get().user;
    if (!currentUser) return;

    try {
      const user = (await api.hosts.get(currentUser.id)) as unknown as User;
      set({ user });
      writeProfileCache(user);
    } catch (err) {
      log.error("[Auth] Failed to refresh profile:", err);
    }
  },
  initialize: async () => {
    log.info("[Auth] Initializing authentication...");
    try {
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        log.info("[Auth] No active session token found");
        clearCaches();
        set({ isAuthenticated: false, isLoading: false, user: null });
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          log.warn("[Auth] Session invalid or expired");
          clearCaches();
          set({ isAuthenticated: false, isLoading: false, user: null, error: null });
          return;
        }

        const text = await res.text();
        const hostData = text ? JSON.parse(text) : null;
        const user = hostData as User;

        log.info("[Auth] Authentication successful");
        set({ user, isAuthenticated: true, isLoading: false, error: null });
        writeProfileCache(user);
      } catch (apiErr) {
        log.error("[Auth] Profile API fetch error:", apiErr);
        const cached = readProfileCache();
        if (cached) {
          set({ user: cached, isAuthenticated: true, isLoading: false });
        } else {
          throw apiErr;
        }
      }
    } catch (err: unknown) {
      log.error("[Auth] Authentication initialization failed:", (err as Error).message);
      set({
        isAuthenticated: false,
        isLoading: false,
        error: (err as Error).message || "Failed to initialize auth",
      });
    }
  },
  login: async (email: string, password: string) => {
    log.info("[Auth] Login attempt for email:", email);
    try {
      set({ isLoading: true, error: null });

      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const text = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: `Server error: ${res.status} ${res.statusText}` };
      }

      if (!res.ok) {
        throw new Error((data.error as string) || "Invalid credentials");
      }

      localStorage.setItem(TOKEN_KEY, data.token as string);
      const user = data.user as User;
      writeProfileCache(user);
      api.invalidateAllCaches();

      log.info("[Auth] Login successful");
      set({ user, isAuthenticated: true, isLoading: false, error: null });
    } catch (error: unknown) {
      const errorMessage = (error as Error).message || "Invalid credentials";
      log.error("[Auth] Login failed:", errorMessage);
      set({ error: errorMessage, isLoading: false, isAuthenticated: false, user: null });
    }
  },
  signup: async (
    email: string,
    password: string,
    name: string,
    departmentId?: string,
    role?: string,
    rollNumber?: string
  ) => {
    log.info("[Auth] Signup attempt:", { email, name, departmentId, role, rollNumber });
    try {
      set({ isLoading: true, error: null });

      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          name,
          department_id: departmentId || undefined,
          role: role || "visitor",
          roll_number: rollNumber || undefined,
        }),
      });


      const text = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { error: `Server error: ${res.status} ${res.statusText}` };
      }

      if (!res.ok) {
        throw new Error((data.error as string) || "Failed to create account");
      }

      if (data.requiresVerification) {
        log.info("[Auth] Signup successful. Verification required.");
        set({ isLoading: false, error: null });
        return { requiresVerification: true, email: data.email as string };
      }

      localStorage.setItem(TOKEN_KEY, data.token as string);
      const user = data.user as User;
      writeProfileCache(user);
      api.invalidateAllCaches();

      log.info("[Auth] Signup successful.");
      set({ user, isAuthenticated: true, isLoading: false, error: null });
      return { requiresVerification: false };
    } catch (error: unknown) {
      const errorMessage = (error as Error).message || "Failed to create account";
      log.error("[Auth] Signup failed:", errorMessage);
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },
  logout: async () => {
    log.info("[Auth] Logout initiated");
    try {
      set({ isLoading: true, error: null });

      clearCaches();
      api.invalidateAllCaches();
      ["vms_recent_visits", "vms_active_visitors", "vms_users"].forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch {
        }
      });
      Object.keys(localStorage)
        .filter((k) => k.startsWith("vms_stats_cache_"))
        .forEach((k) => {
          try {
            localStorage.removeItem(k);
          } catch {
          }
        });

      log.info("[Auth] Logout successful");
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    } catch (error: unknown) {
      log.error("[Auth] Logout failed:", (error as Error).message);
      set({ error: "Failed to logout", isLoading: false });
    }
  },
}));
