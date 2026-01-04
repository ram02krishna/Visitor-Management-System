import { create } from "zustand";
import { supabase } from "../lib/supabase.ts";
import type { Database } from "../lib/database.types";
import log from "../lib/logger.ts";

type UserRole = Database["public"]["Enums"]["user_role"];

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
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  //  Initialize authentication
  initialize: async () => {
    log.info("[Auth] Initializing authentication...");
    try {
      log.info("[Auth] Fetching session from Supabase...");
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        log.error("[Auth] Session fetch error:", error.message);
        set({ isAuthenticated: false, isLoading: false });
        return;
      }

      if (session?.user) {
        log.info("[Auth] Session found for user:", session.user.id);
        log.info("[Auth] Fetching host data from database...");

        const { data: hostData, error: hostError } = await supabase
          .from("hosts")
          .select("*")
          .eq("auth_id", session.user.id)
          .single();

        if (hostError && hostError.code !== "PGRST116") {
          log.error("[Auth] Host data fetch error:", hostError);
          throw hostError;
        }

        if (hostData) {
          log.info("[Auth] Host data retrieved:", {
            id: hostData.id,
            name: hostData.name,
            role: hostData.role,
            email: hostData.email,
          });

          if (hostData.role === "visitor") {
            log.warn("[Auth] Visitor role blocked");
            throw new Error("Visitor role is no longer supported");
          }

          log.info("[Auth] Authentication successful");
          set({
            user: hostData as User,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } else {
          log.info("[Auth] No host data found for session user.");
          set({ isAuthenticated: false, isLoading: false, user: null });
        }
      } else {
        log.info("[Auth] No active session found");
        set({ isAuthenticated: false, isLoading: false, user: null });
      }
    } catch (err: unknown) {
      log.error("[Auth] Authentication initialization failed:", (err as Error).message);
      log.error("[Auth] Error details:", err);
      set({
        isAuthenticated: false,
        isLoading: false,
        error: (err as Error).message || "Failed to initialize auth",
      });
    }
  },

  //  Login function
  login: async (email: string, password: string) => {
    log.info("[Auth] Login attempt for email:", email);
    try {
      set({ isLoading: true, error: null });

      log.info("[Auth] Signing in with Supabase...");
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        log.error("[Auth] Sign-in error:", error.message);
        throw error;
      }

      if (data?.user) {
        log.info("[Auth] Sign-in successful, user ID:", data.user.id);
        log.info("[Auth] Fetching host data...");

        const { data: hostData, error: hostError } = await supabase
          .from("hosts")
          .select("*")
          .eq("auth_id", data.user.id)
          .single();

        if (hostError) {
          log.error("[Auth] Host data fetch error:", hostError);
          throw hostError;
        }

        log.info("[Auth] Host data retrieved:", {
          id: hostData.id,
          name: hostData.name,
          role: hostData.role,
          email: hostData.email,
        });

        //  Block visitor role
        if (hostData.role === "visitor") {
          log.warn("[Auth] Login blocked: visitor role");
          throw new Error("Visitor role is no longer supported");
        }

        log.info("[Auth] Login successful");
        set({
          user: hostData as User,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      }
    } catch (error: unknown) {
      log.error("[Auth] Login failed:", (error as Error).message);
      log.error("[Auth] Error details:", error);
      set({
        error: (error as Error).message || "Invalid credentials",
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });
    }
  },

  // Signup function
  signup: async (email: string, password: string, name: string, departmentId: string) => {
    log.info("[Auth] Signup attempt:", { email, name, departmentId });
    try {
      set({ isLoading: true, error: null });

      log.info("[Auth] Creating auth user in Supabase...");
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            department_id: departmentId,
          },
        },
      });

      if (signUpError) {
        log.error("[Auth] Sign-up error:", signUpError.message);
        throw signUpError;
      }

      if (!authData.user) {
        log.error("[Auth] No user data returned from sign-up");
        throw new Error("Failed to create user account");
      }

      log.info("[Auth] Auth user created:", authData.user.id);

      // Host record will be created by a database trigger.
      // Now, simply set loading to false and clear error.
      log.info("[Auth] Signup successful; host record handled by trigger.");
      set({ isLoading: false, error: null });
    } catch (error: unknown) {
      log.error("[Auth] Signup failed:", (error as Error).message);
      log.error("[Auth] Error details:", error);
      set({
        error: (error as Error).message || "Failed to create account",
        isLoading: false,
      });
      throw error;
    }
  },

  // Logout function
  logout: async () => {
    log.info("[Auth] Logout initiated");
    try {
      set({ isLoading: true, error: null });
      log.info("[Auth] Signing out from Supabase...");
      await supabase.auth.signOut();
      log.info("[Auth] Logout successful");
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    } catch (error: unknown) {
      log.error("[Auth] Logout failed:", (error as Error).message);
      log.error("[Auth] Error details:", error);
      set({ error: "Failed to logout", isLoading: false });
    }
  },

  // Sign in with Google
  signInWithGoogle: async () => {
    log.info("[Auth] Initiating Google Sign-In...");
    try {
      set({ isLoading: true, error: null });
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
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
