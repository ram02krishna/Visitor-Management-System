import { create } from "zustand";
import { supabase } from "../lib/supabase.ts";
import type { Database } from "../lib/database.types";
import log from "../lib/logger.ts";

export type UserRole = Database["public"]["Enums"]["user_role"];

export interface User {
  id: string;
  auth_id: string;
  name: string;
  email: string;
  role: UserRole;
  department_id: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, departmentId: string) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ─── Profile Cache ────────────────────────────────────────────────────────────
// Persist the user profile so `initialize()` can hydrate instantly from cache
// while the real session is verified in the background.
const PROFILE_CACHE_KEY = "vms_user_profile";

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
  } catch {/* quota — silently ignore */}
}

function clearProfileCache() {
  try {
    localStorage.removeItem(PROFILE_CACHE_KEY);
  } catch {/* ignore */}
}
// ─────────────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  // Hydrate immediately from cache so the UI skips the full-screen spinner
  // on return visits. Will be replaced/cleared once the real session resolves.
  user: readProfileCache(),
  isAuthenticated: readProfileCache() !== null,
  isLoading: true,
  error: null,

  refreshProfile: async () => {
    const currentUser = get().user;
    if (!currentUser) return;

    try {
      const { data: hostData, error } = await supabase
        .from("hosts")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (error) throw error;
      if (hostData) {
        const user = hostData as User;
        set({ user });
        writeProfileCache(user);
      }
    } catch (err) {
      log.error("[Auth] Failed to refresh profile:", err);
    }
  },

  // ── Initialize authentication ──────────────────────────────────────────────
  // 1. Pre-populate from cache instantly (zero spinner for returning users).
  // 2. Verify session with Supabase in the background.
  // 3. Re-hydrate profile from DB to pick up any role/name changes.
  initialize: async () => {
    log.info("[Auth] Initializing authentication...");
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        log.error("[Auth] Session fetch error:", error.message);
        clearProfileCache();
        set({ isAuthenticated: false, isLoading: false, user: null });
        return;
      }

      if (session?.user) {
        log.info("[Auth] Session found for user:", session.user.id);

        // Check if cache already matches this session — skip DB call if so
        const cached = readProfileCache();
        if (cached?.auth_id === session.user.id) {
          log.info("[Auth] Profile cache hit — hydrating instantly");
          set({ user: cached, isAuthenticated: true, isLoading: false, error: null });
          // Background revalidation to pick up remote changes (role updates etc.)
          supabase
            .from("hosts")
            .select("*")
            .eq("auth_id", session.user.id)
            .single()
            .then(({ data }) => {
              if (data) {
                const fresh = data as User;
                set({ user: fresh });
                writeProfileCache(fresh);
              }
            });
          return;
        }

        // Cache miss — fetch profile normally
        const { data: hostData, error: hostError } = await supabase
          .from("hosts")
          .select("*")
          .eq("auth_id", session.user.id)
          .single();

        if (hostError && hostError.code !== "PGRST116") {
          log.error("[Auth] Profile data fetch error:", hostError);
          throw hostError;
        }

        if (hostData) {
          const user = hostData as User;
          log.info("[Auth] Authentication successful");
          set({ user, isAuthenticated: true, isLoading: false, error: null });
          writeProfileCache(user);
        } else {
          log.warn("[Auth] Auth session exists but no profile record found");
          await supabase.auth.signOut();
          clearProfileCache();
          set({ isAuthenticated: false, isLoading: false, user: null, error: null });
        }
      } else {
        log.info("[Auth] No active session found");
        clearProfileCache();
        set({ isAuthenticated: false, isLoading: false, user: null });
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

  // ── Login ──────────────────────────────────────────────────────────────────
  login: async (email: string, password: string) => {
    log.info("[Auth] Login attempt for email:", email);
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        log.error("[Auth] Sign-in error:", error.message);
        throw error;
      }

      if (data?.user) {
        const { data: hostData, error: hostError } = await supabase
          .from("hosts")
          .select("*")
          .eq("auth_id", data.user.id)
          .single();

        if (hostError) {
          if (hostError.code === "PGRST116") {
            await supabase.auth.signOut();
            throw new Error(
              "Your account setup is incomplete. Please contact support or try signing up again."
            );
          }
          throw hostError;
        }

        const user = hostData as User;
        writeProfileCache(user);
        log.info("[Auth] Login successful");
        set({ user, isAuthenticated: true, isLoading: false, error: null });
      }
    } catch (error: unknown) {
      const errorMessage = (error as Error).message || "Invalid credentials";
      log.error("[Auth] Login failed:", errorMessage);
      set({ error: errorMessage, isLoading: false, isAuthenticated: false, user: null });
    }
  },

  signup: async (email: string, password: string, name: string, departmentId: string) => {
    log.info("[Auth] Signup attempt:", { email, name, departmentId });
    try {
      set({ isLoading: true, error: null });

      const { data: existingHost, error: checkError } = await supabase
        .from("hosts")
        .select("id, email, auth_id")
        .eq("email", email)
        .single();

      if (checkError && checkError.code !== "PGRST116") {
        log.error("[Auth] Error checking for existing profile:", checkError.message);
      }

      if (existingHost) {
        throw new Error("An account with this email already exists. Please sign in instead.");
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name, department_id: departmentId },
        },
      });

      if (signUpError) {
        if (
          signUpError.message.includes("already registered") ||
          signUpError.message.includes("User already exists") ||
          signUpError.message.includes("already exists") ||
          signUpError.status === 422
        ) {
          throw new Error(
            "This email is already registered. Please sign in with your existing account, or reset your password if you forgot it."
          );
        }
        throw signUpError;
      }

      if (!authData.user) throw new Error("Failed to create user account");

      log.info("[Auth] Signup successful; profile record handled by trigger.");
      set({ isLoading: false, error: null });
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
      await supabase.auth.signOut();
      clearProfileCache();
      // Also clear dashboard caches
      ["vms_recent_visits", "vms_active_visitors", "vms_users"].forEach((k) => {
        try { localStorage.removeItem(k); } catch {/* ignore */}
      });
      // Clear stats caches (all roles)
      Object.keys(localStorage)
        .filter((k) => k.startsWith("vms_stats_cache_"))
        .forEach((k) => { try { localStorage.removeItem(k); } catch {/* ignore */} });
      log.info("[Auth] Logout successful");
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    } catch (error: unknown) {
      log.error("[Auth] Logout failed:", (error as Error).message);
      set({ error: "Failed to logout", isLoading: false });
    }
  },

  signInWithGoogle: async () => {
    log.info("[Auth] Initiating Google Sign-In...");
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google" });
      if (error) {
        log.error("[Auth] Google Sign-In error:", error.message);
        throw error;
      }
    } catch (error: unknown) {
      log.error("[Auth] Google Sign-In failed:", (error as Error).message);
      set({
        error: (error as Error).message || "Google Sign-In failed",
        isLoading: false,
      });
    }
  },
}));
