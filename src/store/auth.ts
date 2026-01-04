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

export const useAuthStore = create<AuthState>((set, get) => {
  const _fetchAndSetUser = async (userId: string) => {
    log.info('[Auth] Fetching host data for user:', userId);
    const { data: hostData, error: hostError } = await supabase
      .from("hosts")
      .select("*")
      .eq("auth_id", userId)
      .single();

    if (hostError) {
      log.error('[Auth] Host data fetch error:', hostError);
      set({ user: null, isAuthenticated: false, isLoading: false, error: hostError.message });
      throw hostError;
    }

    if (hostData) {
      log.info('[Auth] Host data retrieved:', { id: hostData.id, name: hostData.name, role: hostData.role });
      // Block visitor role
      if (hostData.role === "visitor") {
        log.warn('[Auth] Login blocked: visitor role is not supported.');
        const error = new Error("Visitor role is no longer supported");
        set({ user: null, isAuthenticated: false, isLoading: false, error: error.message });
        throw error;
      }
      log.info('[Auth] User set in store.');
      set({ user: hostData as User, isAuthenticated: true, isLoading: false, error: null });
    } else {
       const error = new Error("User profile not found.");
       log.warn('[Auth] Host data not found for user:', userId);
       set({ user: null, isAuthenticated: false, isLoading: false, error: error.message });
       throw error;
    }
  };

  return {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,

    initialize: async () => {
      log.info('[Auth] Initializing authentication...');
      set({ isLoading: true });
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          await _fetchAndSetUser(session.user.id);
        } else {
          set({ isAuthenticated: false, user: null });
        }
      } catch (err: unknown) {
        log.error('[Auth] Authentication initialization failed:', (err as Error).message);
        set({
          user: null,
          isAuthenticated: false,
          error: (err as Error).message || "Failed to initialize auth",
        });
        // Do not rethrow here, as initialization failure shouldn't crash the app
      } finally {
        set({ isLoading: false });
      }
    },

    login: async (email: string, password: string) => {
      log.info('[Auth] Login attempt for email:', email);
      set({ isLoading: true, error: null });
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          await _fetchAndSetUser(data.user.id);
        }
      } catch (error: unknown) {
        log.error('[Auth] Login failed:', (error as Error).message);
        set({
          error: (error as Error).message || "Invalid credentials",
          isAuthenticated: false,
          user: null,
        });
        throw error; // Re-throw for the UI to handle
      } finally {
        set({ isLoading: false });
      }
    },

    signup: async (email: string, password: string, name: string, departmentId: string) => {
      log.info('[Auth] Signup attempt:', { email, name, departmentId });
      set({ isLoading: true, error: null });
      try {
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

        if (signUpError) throw signUpError;
        if (!authData.user) throw new Error("Failed to create user account");

        log.info('[Auth] Auth user created, host record will be created by trigger:', authData.user.id);
        // We don't set the user here, they need to verify email first.
      } catch (error: unknown) {
        log.error('[Auth] Signup failed:', (error as Error).message);
        set({ error: (error as Error).message || "Failed to create account" });
        throw error; // Re-throw for the UI to handle
      } finally {
        set({ isLoading: false });
      }
    },

    logout: async () => {
      log.info('[Auth] Logout initiated');
      set({ isLoading: true, error: null });
      try {
        await supabase.auth.signOut();
        log.info('[Auth] Logout successful');
        set({ user: null, isAuthenticated: false });
      } catch (error: unknown) {
        log.error('[Auth] Logout failed:', (error as Error).message);
        set({ error: "Failed to logout" });
        throw error; // Re-throw for the UI to handle
      } finally {
        set({ isLoading: false });
      }
    },

    signInWithGoogle: async () => {
      log.info('[Auth] Initiating Google Sign-In...');
      set({ isLoading: true, error: null });
      try {
        const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
        if (error) throw error;
      } catch (error: unknown) {
        log.error('[Auth] Google Sign-In failed:', (error as Error).message);
        set({ error: (error as Error).message || 'Google Sign-In failed' });
        throw error; // Re-throw for the UI to handle
      } finally {
        set({ isLoading: false });
      }
    },
  };
});
